from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    followers = models.ManyToManyField("self", blank=True, symmetrical=False, related_name="following")
    description = models.TextField(max_length=500, blank=True)
    profile_picture = models.ImageField(upload_to="profile_pictures", default="profile_pictures/default.jpg")


    def __str__(self):
        return f"{self.username}"

class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
    text = models.TextField(max_length=500)
    timestamp = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User, blank=True, related_name="likes") 

    def __str__(self):
        return f"{self.user} posted {self.text} at {self.timestamp} with {self.likes} likes"
    
class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comments")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True, related_name="comments")
    parent_comment = models.ForeignKey('self', on_delete=models.CASCADE, related_name="replies", null=True, blank=True)
    text = models.TextField(max_length=500)
    timestamp = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User, blank=True, related_name="comment_likes")
    
    def __str__(self):
        return f"{self.user} commented {self.text} on {self.post} at {self.timestamp}"
    
class Image(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="images", null=True, blank=True)
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name="images", null=True, blank=True)
    image = models.ImageField(upload_to="post_images")

    def __str__(self):
        return f"{self.post} has image {self.image}"

        
