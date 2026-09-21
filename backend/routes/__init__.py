"""路由包."""
from .changes import router as changes_router      # noqa
from .change_detail import router as detail_router  # noqa
from .artifact import router as artifact_router     # noqa
from .health import router as health_router         # noqa
from .token_usage import router as token_router     # noqa
from .git_safety import router as git_router        # noqa
from .search import router as search_router         # noqa
