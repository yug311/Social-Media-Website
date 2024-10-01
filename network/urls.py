
from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("posts", views.posts, name="posts"),
    path("like/", views.like, name="like"),
    path("edit/", views.edit, name="edit"),
    path("follow/", views.follow, name="follow"),
    path("newpost/", views.newpost, name="newpost"),
    path("search/", views.search, name="search"),
    path("suggestFollow/", views.followSuggestions, name="suggestFollow"),
    path("test/", views.test, name="test"),
    path("profile/", views.profile, name="profile"),
    path("testy/", views.testy, name="testy"),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)