"""Agent 资料源 + 跨渠道记忆 API."""
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models.knowledge_source import KnowledgeSource, SOURCE_TYPES
from models.agent_memory import AgentMemory, CHANNELS, MEMORY_TYPES
import datetime
import os
import threading

router = APIRouter(prefix="/api/agents", tags=["agent-knowledge"])


def _user(request: Request) -> dict:
    return getattr(request.state, "user", {"id": "admin", "name": "admin", "role": "admin"})


def _uid(request: Request) -> str:
    return _user(request).get("id", "admin")


def _get_agent_domain_id(agent_id: int, db: Session) -> int | None:
    """获取 agent 的 domain_id，用于记忆隔离."""
    from models.agent import Agent
    ag = db.query(Agent).filter(Agent.id == agent_id).first()
    return ag.domain_id if ag else None


# ═══════════════════════════════════════════
# 资料源 CRUD
# ═══════════════════════════════════════════

@router.get("/{agent_id}/knowledge-sources")
def list_sources(agent_id: int, request: Request, tag: str | None = None, db: Session = Depends(get_db)):
    """获取 Agent 的所有资料源，支持按标签过滤."""
    owner_id = _uid(request)
    q = db.query(KnowledgeSource).filter(
        KnowledgeSource.agent_id == agent_id,
        KnowledgeSource.owner_id == owner_id,
    )
    # 标签过滤
    if tag:
        from models.knowledge_tag import KnowledgeTag, KnowledgeSourceTag
        # 查找匹配 tag name 的 source_id 列表
        tag_obj = db.query(KnowledgeTag).filter(
            KnowledgeTag.name == tag,
            KnowledgeTag.owner_id == owner_id,
        ).first()
        if tag_obj:
            source_ids = db.query(KnowledgeSourceTag.source_id).filter(
                KnowledgeSourceTag.tag_id == tag_obj.id
            ).all()
            sid_list = [row[0] for row in source_ids]
            q = q.filter(KnowledgeSource.id.in_(sid_list))
        else:
            # tag 不存在，返回空结果
            return []
    sources = q.order_by(KnowledgeSource.created_at.desc()).all()
    # 附加标签信息
    result = []
    for s in sources:
        d = s.to_dict()
        # 查询标签
        from models.knowledge_tag import KnowledgeTag, KnowledgeSourceTag
        tag_rows = db.query(KnowledgeTag).join(
            KnowledgeSourceTag, KnowledgeSourceTag.tag_id == KnowledgeTag.id
        ).filter(KnowledgeSourceTag.source_id == s.id).all()
        d["tags"] = [t.to_dict() for t in tag_rows]
        result.append(d)
    return result


@router.post("/{agent_id}/knowledge-sources")
def create_source(agent_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """为 Agent 添加资料源."""
    owner_id = _uid(request)
    stype = payload.get("source_type", "http_api")
    if stype not in SOURCE_TYPES:
        raise HTTPException(status_code=400, detail=f"不支持的类型: {stype}，支持: {SOURCE_TYPES}")

    ks = KnowledgeSource(
        agent_id=agent_id,
        owner_id=owner_id,
        name=payload.get("name", ""),
        source_type=stype,
        url=payload.get("url", ""),
        config_json=payload.get("config_json", {}),
        enabled=payload.get("enabled", True),
        description=payload.get("description", ""),
    )
    db.add(ks)
    db.commit()
    db.refresh(ks)
    return {"ok": True, "source": ks.to_dict()}


@router.put("/{agent_id}/knowledge-sources/{source_id}")
def update_source(agent_id: int, source_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """更新资料源配置."""
    owner_id = _uid(request)
    ks = db.query(KnowledgeSource).filter(
        KnowledgeSource.id == source_id,
        KnowledgeSource.agent_id == agent_id,
        KnowledgeSource.owner_id == owner_id,
    ).first()
    if not ks:
        raise HTTPException(status_code=404, detail="资料源不存在")

    for field in ["name", "source_type", "url", "config_json", "enabled", "description"]:
        if field in payload:
            setattr(ks, field, payload[field])
    ks.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(ks)
    return {"ok": True, "source": ks.to_dict()}


@router.delete("/{agent_id}/knowledge-sources/{source_id}")
def delete_source(agent_id: int, source_id: int, request: Request, db: Session = Depends(get_db)):
    """删除资料源."""
    owner_id = _uid(request)
    ks = db.query(KnowledgeSource).filter(
        KnowledgeSource.id == source_id,
        KnowledgeSource.agent_id == agent_id,
        KnowledgeSource.owner_id == owner_id,
    ).first()
    if not ks:
        raise HTTPException(status_code=404, detail="资料源不存在")
    db.delete(ks)
    db.commit()
    return {"ok": True}


@router.post("/{agent_id}/knowledge-sources/{source_id}/test")
def test_source(agent_id: int, source_id: int, request: Request, db: Session = Depends(get_db)):
    """测试资料源连接."""
    import urllib.request
    import json as _json

    owner_id = _uid(request)
    ks = db.query(KnowledgeSource).filter(
        KnowledgeSource.id == source_id,
        KnowledgeSource.agent_id == agent_id,
        KnowledgeSource.owner_id == owner_id,
    ).first()
    if not ks:
        raise HTTPException(status_code=404, detail="资料源不存在")

    try:
        if ks.source_type in ("http_api", "rag_api", "url_crawl"):
            req = urllib.request.Request(ks.url, method="HEAD")
            cfg = ks.config_json or {}
            if cfg.get("api_key"):
                req.add_header("Authorization", f"Bearer {cfg['api_key']}")
            resp = urllib.request.urlopen(req, timeout=10)
            ok = resp.status < 400
            detail = f"HTTP {resp.status}"
        elif ks.source_type == "redis":
            import redis
            cfg = ks.config_json or {}
            r = redis.Redis.from_url(ks.url, socket_connect_timeout=5)
            r.ping()
            ok = True
            detail = "Redis PONG"
        elif ks.source_type in ("mysql", "postgres"):
            # 只测试 URL 可达性，不实际连接数据库
            from urllib.parse import urlparse
            parsed = urlparse(ks.url)
            ok = bool(parsed.scheme and parsed.hostname)
            detail = f"URL 格式校验通过: {parsed.scheme}://{parsed.hostname}"
        else:
            ok = True
            detail = "URL 格式校验通过"

    except Exception as e:
        ok = False
        detail = str(e)[:200]

    ks.last_test_at = datetime.datetime.utcnow()
    ks.last_test_ok = ok
    db.commit()
    return {"ok": ok, "detail": detail}


# ═══════════════════════════════════════════
# 文件上传
# ═══════════════════════════════════════════

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".py", ".js", ".json"}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
UPLOAD_BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")


def _sanitize_filename(filename: str) -> str:
    """防止路径遍历攻击：去除路径分隔符和危险字符."""
    import re
    # 只保留文件名部分（去除路径）
    basename = os.path.basename(filename)
    # 去除所有路径分隔符和特殊字符，只保留字母数字中文下划线连字符点
    safe = re.sub(r'[^\w\u4e00-\u9fff\-.]', '_', basename)
    # 去除连续下划线
    safe = re.sub(r'_+', '_', safe)
    # 去除开头结尾的下划线/点
    safe = safe.strip('_.')
    if not safe:
        safe = "unnamed_file"
    return safe


def _extract_text(file_path: str, ext: str) -> str:
    """从文件中提取文本内容."""
    if ext in (".txt", ".md", ".py", ".js", ".json"):
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    elif ext == ".pdf":
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text.strip()
        except Exception as e:
            raise RuntimeError(f"PDF 解析失败: {str(e)}")
    elif ext == ".docx":
        try:
            from docx import Document
            doc = Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            return "\n\n".join(paragraphs)
        except Exception as e:
            raise RuntimeError(f"DOCX 解析失败: {str(e)}")
    else:
        raise RuntimeError(f"不支持的文件类型: {ext}")


def _chunk_text(text: str, filename: str, max_chars: int = 2000) -> list[tuple[str, str]]:
    """按段落分块，每块最大 max_chars 字符.
    
    返回 [(key, chunk_text), ...] 列表.
    """
    # 按空行分割段落
    paragraphs = text.split("\n\n")
    
    chunks: list[tuple[str, str]] = []
    current_chunk: list[str] = []
    current_len = 0
    chunk_idx = 0
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        
        para_len = len(para)
        
        # 如果单个段落超过 max_chars，强制分割
        if para_len > max_chars:
            # 先保存当前 chunk
            if current_chunk:
                key = f"{filename}_chunk_{chunk_idx}"
                chunks.append((key, "\n\n".join(current_chunk)))
                chunk_idx += 1
                current_chunk = []
                current_len = 0
            
            # 对超长段落按字符分割
            for i in range(0, para_len, max_chars):
                sub = para[i:i + max_chars]
                key = f"{filename}_chunk_{chunk_idx}"
                chunks.append((key, sub))
                chunk_idx += 1
            continue
        
        # 如果加入后超过限制，先保存当前 chunk
        if current_len + para_len + (2 if current_chunk else 0) > max_chars:
            key = f"{filename}_chunk_{chunk_idx}"
            chunks.append((key, "\n\n".join(current_chunk)))
            chunk_idx += 1
            current_chunk = [para]
            current_len = para_len
        else:
            current_chunk.append(para)
            current_len += para_len + (2 if current_chunk else 0)
    
    # 保存最后一个 chunk
    if current_chunk:
        key = f"{filename}_chunk_{chunk_idx}"
        chunks.append((key, "\n\n".join(current_chunk)))
    
    return chunks


def _process_document_async(ks_id: int, agent_id: int, file_path: str):
    """后台处理文档：提取文本 → 分块 → 存储到 agent_memories."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        ks = db.query(KnowledgeSource).filter(KnowledgeSource.id == ks_id).first()
        if not ks:
            return
        
        # ── 阶段 1: 文本提取 ──
        ks.status = "processing"
        ks.updated_at = datetime.datetime.utcnow()
        db.commit()
        
        ext = os.path.splitext(file_path)[1].lower()
        text = _extract_text(file_path, ext)
        if not text or not text.strip():
            raise RuntimeError("提取的文本内容为空")
        
        # ── 阶段 2: 分块 + 索引存储 ──
        ks.status = "indexing"
        ks.updated_at = datetime.datetime.utcnow()
        db.commit()
        
        cfg = ks.config_json or {}
        original_filename = cfg.get("filename", os.path.basename(file_path))
        chunks = _chunk_text(text, original_filename)
        
        # 获取 domain_id
        from models.agent import Agent
        ag = db.query(Agent).filter(Agent.id == agent_id).first()
        dom_id = ag.domain_id if ag else None
        
        # 删除该文件之前的旧 chunks
        old_chunks = db.query(AgentMemory).filter(
            AgentMemory.agent_id == agent_id,
            AgentMemory.memory_type == "document",
            AgentMemory.key.like(f"{original_filename}_chunk_%"),
        ).all()
        for oc in old_chunks:
            db.delete(oc)
        db.commit()
        
        # 存入新 chunks
        import json as _json
        for key, chunk_text in chunks:
            mem = AgentMemory(
                agent_id=agent_id,
                owner_id=ks.owner_id,
                domain_id=dom_id,
                channel="web",
                key=key,
                value=_json.dumps({"text": chunk_text, "source_id": ks_id}, ensure_ascii=False),
                memory_type="document",
                priority=5,
            )
            db.add(mem)
        db.commit()
        
        # ── 阶段 3: 完成 ──
        ks.status = "indexed"
        ks.config_json = {
            **cfg,
            "chunks": len(chunks),
            "total_chars": len(text),
        }
        ks.updated_at = datetime.datetime.utcnow()
        db.commit()
        print(f"[upload] 文件处理完成: {file_path}, 分块数: {len(chunks)}, 总字符: {len(text)}")
        
    except Exception as e:
        print(f"[upload] 文件处理失败: {e}")
        try:
            ks = db.query(KnowledgeSource).filter(KnowledgeSource.id == ks_id).first()
            if ks:
                ks.status = "failed"
                ks.description = f"处理失败: {str(e)[:200]}"
                ks.updated_at = datetime.datetime.utcnow()
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/{agent_id}/knowledge-sources/upload")
def upload_file(
    agent_id: int,
    request: Request,
    file: UploadFile = File(...),
    name: str = Form(default=""),
    description: str = Form(default=""),
    db: Session = Depends(get_db),
):
    """上传本地文件作为知识源（PDF/DOCX/TXT/MD/PY/JS/JSON），最大 10MB."""
    owner_id = _uid(request)

    # 验证文件扩展名
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")
    _, ext = os.path.splitext(file.filename)
    ext = ext.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {ext}，支持: {sorted(ALLOWED_EXTENSIONS)}"
        )

    # 读取文件内容（检查大小）
    contents = file.file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件过大: {len(contents)} bytes，最大允许 {MAX_UPLOAD_SIZE} bytes (10MB)"
        )
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="文件内容为空")

    # 安全文件名（防止路径遍历）
    safe_filename = _sanitize_filename(file.filename)
    timestamp = int(datetime.datetime.utcnow().timestamp())
    stored_filename = f"{timestamp}_{safe_filename}"

    # 确保上传目录存在
    upload_dir = os.path.join(UPLOAD_BASE_DIR, str(agent_id))
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, stored_filename)
    # 最终安全检查：确保 file_path 在 upload_dir 内
    real_upload_dir = os.path.realpath(upload_dir)
    real_file_path = os.path.realpath(file_path)
    if not real_file_path.startswith(real_upload_dir + os.sep) and real_file_path != real_upload_dir:
        raise HTTPException(status_code=400, detail="非法文件路径")

    try:
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")

    # 创建知识源记录
    ks = KnowledgeSource(
        agent_id=agent_id,
        owner_id=owner_id,
        name=name or safe_filename,
        source_type="local_file",
        url=f"file://{file_path}",
        config_json={"filename": safe_filename, "size_bytes": len(contents), "extension": ext},
        enabled=True,
        description=description,
        status="uploading",
        file_path=file_path,
    )
    db.add(ks)
    db.commit()
    db.refresh(ks)

    # 启动后台处理
    t = threading.Thread(target=_process_document_async, args=(ks.id, agent_id, file_path), daemon=True)
    t.start()

    return {"ok": True, "source": ks.to_dict()}


@router.get("/{agent_id}/knowledge-sources/{source_id}/status")
def get_source_status(agent_id: int, source_id: int, request: Request, db: Session = Depends(get_db)):
    """查询资料源的索引/处理状态."""
    owner_id = _uid(request)
    ks = db.query(KnowledgeSource).filter(
        KnowledgeSource.id == source_id,
        KnowledgeSource.agent_id == agent_id,
        KnowledgeSource.owner_id == owner_id,
    ).first()
    if not ks:
        raise HTTPException(status_code=404, detail="资料源不存在")
    
    # 统计 chunks 数量
    cfg = ks.config_json or {}
    chunks_count = cfg.get("chunks", 0)
    
    return {
        "id": ks.id,
        "name": ks.name,
        "source_type": ks.source_type,
        "status": ks.status or "unknown",
        "chunks": chunks_count,
        "filename": cfg.get("filename", ks.name),
        "file_path": ks.file_path,
        "created_at": ks.created_at.isoformat() if ks.created_at else None,
        "updated_at": ks.updated_at.isoformat() if ks.updated_at else None,
    }


# ═══════════════════════════════════════════
# 跨渠道记忆 CRUD
# ═══════════════════════════════════════════

@router.get("/{agent_id}/memory")
def list_memories(
    agent_id: int,
    request: Request,
    db: Session = Depends(get_db),
    channel: str | None = None,
    session_id: str | None = None,
    memory_type: str | None = None,
    key: str | None = None,
    domain_id: int | None = None,
    limit: int = 50,
):
    """获取 Agent 的记忆列表，支持按渠道/会话/类型/key/域过滤."""
    owner_id = _uid(request)
    q = db.query(AgentMemory).filter(
        AgentMemory.agent_id == agent_id,
        AgentMemory.owner_id == owner_id,
    )
    # 域隔离：优先用参数 domain_id，否则自动从 agent 获取
    if domain_id is not None:
        q = q.filter(AgentMemory.domain_id == domain_id)
    else:
        ag_domain = _get_agent_domain_id(agent_id, db)
        if ag_domain is not None:
            q = q.filter(AgentMemory.domain_id == ag_domain)
    if channel:
        q = q.filter(AgentMemory.channel == channel)
    if session_id:
        q = q.filter(AgentMemory.session_id == session_id)
    if memory_type:
        q = q.filter(AgentMemory.memory_type == memory_type)
    if key:
        q = q.filter(AgentMemory.key == key)

    # 清理已过期记忆
    now = datetime.datetime.utcnow()
    expired = db.query(AgentMemory).filter(
        AgentMemory.agent_id == agent_id,
        AgentMemory.expires_at.isnot(None),
        AgentMemory.expires_at < now,
    ).all()
    for e in expired:
        db.delete(e)
    if expired:
        db.commit()

    memories = q.order_by(AgentMemory.priority.desc(), AgentMemory.updated_at.desc()).limit(limit).all()
    return [m.to_dict() for m in memories]


@router.post("/{agent_id}/memory")
def upsert_memory(agent_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """写入或更新 Agent 记忆（按 agent_id + key 去重，upsert 模式）."""
    import json as _json

    owner_id = _uid(request)
    channel = payload.get("channel", "web")
    if channel not in CHANNELS:
        raise HTTPException(status_code=400, detail=f"不支持的渠道: {channel}，支持: {CHANNELS}")

    mtype = payload.get("memory_type", "fact")
    if mtype not in MEMORY_TYPES:
        raise HTTPException(status_code=400, detail=f"不支持的类型: {mtype}，支持: {MEMORY_TYPES}")

    key = payload.get("key", "")
    if not key:
        raise HTTPException(status_code=400, detail="key 不能为空")

    value = payload["value"] if isinstance(payload["value"], str) else _json.dumps(payload["value"], ensure_ascii=False)
    ttl = payload.get("ttl_seconds")

    # 自动获取 domain_id（优先使用 payload 中的，否则从 agent 获取）
    dom_id = payload.get("domain_id")
    if dom_id is None:
        dom_id = _get_agent_domain_id(agent_id, db)

    # upsert: 同 agent + key 去重
    existing = db.query(AgentMemory).filter(
        AgentMemory.agent_id == agent_id,
        AgentMemory.owner_id == owner_id,
        AgentMemory.key == key,
    ).first()

    if existing:
        existing.value = value
        existing.channel = channel
        existing.memory_type = mtype
        existing.domain_id = dom_id
        existing.priority = payload.get("priority", existing.priority)
        existing.ttl_seconds = ttl
        existing.expires_at = (datetime.datetime.utcnow() + datetime.timedelta(seconds=ttl)) if ttl else None
        existing.session_id = payload.get("session_id", existing.session_id)
        existing.updated_at = datetime.datetime.utcnow()
        mem = existing
    else:
        mem = AgentMemory(
            agent_id=agent_id,
            owner_id=owner_id,
            domain_id=dom_id,
            channel=channel,
            session_id=payload.get("session_id"),
            key=key,
            value=value,
            memory_type=mtype,
            priority=payload.get("priority", 5),
            ttl_seconds=ttl,
            expires_at=(datetime.datetime.utcnow() + datetime.timedelta(seconds=ttl)) if ttl else None,
        )
        db.add(mem)

    db.commit()
    db.refresh(mem)
    return {"ok": True, "memory": mem.to_dict()}


@router.delete("/{agent_id}/memory/{memory_id}")
def delete_memory(agent_id: int, memory_id: int, request: Request, db: Session = Depends(get_db)):
    """删除指定记忆."""
    owner_id = _uid(request)
    mem = db.query(AgentMemory).filter(
        AgentMemory.id == memory_id,
        AgentMemory.agent_id == agent_id,
        AgentMemory.owner_id == owner_id,
    ).first()
    if not mem:
        raise HTTPException(status_code=404, detail="记忆不存在")
    db.delete(mem)
    db.commit()
    return {"ok": True}


@router.get("/{agent_id}/memory/channels")
def memory_channels(agent_id: int, request: Request, db: Session = Depends(get_db)):
    """获取该 Agent 的跨渠道记忆统计（按域隔离）."""
    owner_id = _uid(request)
    q = db.query(AgentMemory).filter(
        AgentMemory.agent_id == agent_id,
        AgentMemory.owner_id == owner_id,
    )
    ag_domain = _get_agent_domain_id(agent_id, db)
    if ag_domain is not None:
        q = q.filter(AgentMemory.domain_id == ag_domain)
    memories = q.all()
    stats = {}
    for m in memories:
        ch = m.channel
        if ch not in stats:
            stats[ch] = {"total": 0, "types": {}}
        stats[ch]["total"] += 1
        stats[ch]["types"][m.memory_type] = stats[ch]["types"].get(m.memory_type, 0) + 1
    return {"agent_id": agent_id, "channels": stats, "total": len(memories)}


@router.post("/{agent_id}/memory/search")
def search_memory(agent_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """跨渠道语义搜索记忆（简易版：key/type 匹配 + 全文 LIKE）."""
    import json as _json

    owner_id = _uid(request)
    q_text = payload.get("query", "")
    channel = payload.get("channel")
    mtype = payload.get("memory_type")
    limit = payload.get("limit", 10)

    q = db.query(AgentMemory).filter(
        AgentMemory.agent_id == agent_id,
        AgentMemory.owner_id == owner_id,
    )
    # 域隔离
    dom_id = payload.get("domain_id")
    if dom_id is not None:
        q = q.filter(AgentMemory.domain_id == dom_id)
    else:
        ag_domain = _get_agent_domain_id(agent_id, db)
        if ag_domain is not None:
            q = q.filter(AgentMemory.domain_id == ag_domain)
    if channel:
        q = q.filter(AgentMemory.channel == channel)
    if mtype:
        q = q.filter(AgentMemory.memory_type == mtype)
    if q_text:
        q = q.filter(
            (AgentMemory.key.contains(q_text)) | (AgentMemory.value.contains(q_text))
        )

    # 清理过期
    now = datetime.datetime.utcnow()
    db.query(AgentMemory).filter(
        AgentMemory.expires_at.isnot(None),
        AgentMemory.expires_at < now,
    ).delete()
    db.commit()

    results = q.order_by(AgentMemory.priority.desc()).limit(limit).all()
    return {
        "query": q_text,
        "results": [m.to_dict() for m in results],
        "total": len(results),
    }


# ═══════════════════════════════════════════
# A1: 加载记忆 — 为 Agent 的能力组加载最近记忆
# ═══════════════════════════════════════════

@router.post("/{agent_id}/load-memory")
def load_recent_memories(agent_id: int, payload: dict | None = None, request: Request = None, db: Session = Depends(get_db)):
    """加载 Agent 能力组的最近记忆（同 domain_id + 重叠 capabilities）."""
    import json as _json
    from models.agent import Agent
    from datetime import datetime, timedelta

    owner_id = _uid(request)
    limit = (payload or {}).get("limit", 20)
    days = (payload or {}).get("days", 7)

    ag = db.query(Agent).filter(Agent.id == agent_id, Agent.owner_id == owner_id).first()
    if not ag:
        raise HTTPException(status_code=404, detail="Agent 不存在")

    recent_since = datetime.utcnow() - timedelta(days=days)
    capabilities = (ag.model_config_json or {}).get("capabilities", [])

    # 同 domain_id（含 null）的最近记忆
    mem_q = db.query(AgentMemory).filter(
        AgentMemory.owner_id == owner_id,
        AgentMemory.created_at >= recent_since,
    )
    if ag.domain_id is not None:
        mem_q = mem_q.filter(
            (AgentMemory.domain_id == ag.domain_id) | (AgentMemory.domain_id.is_(None))
        )
    else:
        mem_q = mem_q.filter(AgentMemory.domain_id.is_(None))

    loaded_memories = mem_q.order_by(
        AgentMemory.priority.desc(), AgentMemory.created_at.desc()
    ).limit(limit).all()

    # 按 capability 过滤：记忆的 key/value 包含 capability 关键词
    if capabilities:
        filtered = []
        for m in loaded_memories:
            search_text = (m.key + " " + (m.value or "")).lower()
            for cap in capabilities:
                if cap.lower() in search_text:
                    filtered.append(m)
                    break
        loaded_memories = filtered

    results = [m.to_dict() for m in loaded_memories]
    return {
        "agent_id": agent_id,
        "domain_id": ag.domain_id,
        "capabilities": capabilities,
        "memories": results,
        "loaded_count": len(results),
    }


# ═══════════════════════════════════════════
# 知识库标签 CRUD
# ═══════════════════════════════════════════

@router.get("/knowledge/tags")
def list_tags(request: Request, db: Session = Depends(get_db)):
    """获取当前用户的所有标签."""
    from models.knowledge_tag import KnowledgeTag
    owner_id = _uid(request)
    tags = db.query(KnowledgeTag).filter(
        KnowledgeTag.owner_id == owner_id,
    ).order_by(KnowledgeTag.created_at.desc()).all()
    return [t.to_dict() for t in tags]


@router.post("/knowledge/tags")
def create_tag(payload: dict, request: Request, db: Session = Depends(get_db)):
    """创建标签."""
    from models.knowledge_tag import KnowledgeTag
    owner_id = _uid(request)
    tag = KnowledgeTag(
        name=payload.get("name", "").strip(),
        color=payload.get("color", "#3b82f6"),
        owner_id=owner_id,
    )
    if not tag.name:
        raise HTTPException(status_code=400, detail="标签名称不能为空")
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return {"ok": True, "tag": tag.to_dict()}


@router.put("/knowledge/tags/{tag_id}")
def update_tag(tag_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """更新标签."""
    from models.knowledge_tag import KnowledgeTag
    owner_id = _uid(request)
    tag = db.query(KnowledgeTag).filter(
        KnowledgeTag.id == tag_id,
        KnowledgeTag.owner_id == owner_id,
    ).first()
    if not tag:
        raise HTTPException(status_code=404, detail="标签不存在")
    if "name" in payload:
        tag.name = payload["name"].strip()
    if "color" in payload:
        tag.color = payload["color"]
    db.commit()
    db.refresh(tag)
    return {"ok": True, "tag": tag.to_dict()}


@router.delete("/knowledge/tags/{tag_id}")
def delete_tag(tag_id: int, request: Request, db: Session = Depends(get_db)):
    """删除标签（级联删除关联）."""
    from models.knowledge_tag import KnowledgeTag, KnowledgeSourceTag
    owner_id = _uid(request)
    tag = db.query(KnowledgeTag).filter(
        KnowledgeTag.id == tag_id,
        KnowledgeTag.owner_id == owner_id,
    ).first()
    if not tag:
        raise HTTPException(status_code=404, detail="标签不存在")
    # 删除关联
    db.query(KnowledgeSourceTag).filter(KnowledgeSourceTag.tag_id == tag_id).delete()
    db.delete(tag)
    db.commit()
    return {"ok": True}


# ═══════════════════════════════════════════
# 资料源—标签关联
# ═══════════════════════════════════════════

@router.post("/knowledge-sources/{source_id}/tags")
def add_source_tag(source_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """为资料源添加标签."""
    from models.knowledge_tag import KnowledgeTag, KnowledgeSourceTag
    owner_id = _uid(request)
    tag_id = payload.get("tag_id")
    if not tag_id:
        raise HTTPException(status_code=400, detail="缺少 tag_id")

    # 验证 tag 归属
    tag = db.query(KnowledgeTag).filter(
        KnowledgeTag.id == tag_id,
        KnowledgeTag.owner_id == owner_id,
    ).first()
    if not tag:
        raise HTTPException(status_code=404, detail="标签不存在")

    # 检查是否已关联
    existing = db.query(KnowledgeSourceTag).filter(
        KnowledgeSourceTag.source_id == source_id,
        KnowledgeSourceTag.tag_id == tag_id,
    ).first()
    if existing:
        return {"ok": True, "source_tag": existing.to_dict(), "tag": tag.to_dict()}

    st = KnowledgeSourceTag(source_id=source_id, tag_id=tag_id)
    db.add(st)
    db.commit()
    db.refresh(st)
    return {"ok": True, "source_tag": st.to_dict(), "tag": tag.to_dict()}


@router.delete("/knowledge-sources/{source_id}/tags/{tag_id}")
def remove_source_tag(source_id: int, tag_id: int, request: Request, db: Session = Depends(get_db)):
    """从资料源移除标签."""
    from models.knowledge_tag import KnowledgeSourceTag
    owner_id = _uid(request)
    st = db.query(KnowledgeSourceTag).filter(
        KnowledgeSourceTag.source_id == source_id,
        KnowledgeSourceTag.tag_id == tag_id,
    ).first()
    if not st:
        raise HTTPException(status_code=404, detail="关联不存在")
    db.delete(st)
    db.commit()
    return {"ok": True}
