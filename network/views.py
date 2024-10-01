# things I can add
# suggest users to follow
#     metrics: location, mutuals, likes/comments, post/profile clicks and views, 
#     - trend analysis
#     - CHATBOT
#     - content curation/algorithms/ML
#     - post creation AI
#     - u

# - machine learning to recommend posts 


from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.core.serializers import serialize
from .models import User, Post, Comment, Image
import json
from django.views.decorators.csrf import csrf_exempt
from django.db.models import F
from django.core.serializers.json import DjangoJSONEncoder

def testy(request):
    return render(request, "network/index.html")

@login_required
def index(request):

    if not request.user.is_authenticated:
        return HttpResponseRedirect(reverse("login"))

    userid = request.GET.get("userid")
    pagetype = request.GET.get("pagetype")

    if userid:
        user = User.objects.get(id=userid)
    else:
        user = request.user

    if pagetype == "comment":
        postid = request.GET.get("postid")
        postid = int(postid)
        commtype = request.GET.get("commenttype")
        if(commtype != "comment"):
            print("post")
            post = Post.objects.filter(id=postid).first()
            liked = post in user.likes.all()
        else:
            print("comment")
            post = Comment.objects.get(id=postid) #parent comment
            liked = post in user.comment_likes.all()

        #check if user liked the post


        return render(request, "network/index.html", {
            "user_var": user,
            "pagetype": pagetype,
            "post_var": post,
            "liked": liked,
            "commenttype": commtype,
        })

    return render(request, "network/layout.html", {
        "user_var": user,
        "pagetype": pagetype,
        "search": request.GET.get("search"),
    })


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("login"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")
    

@login_required
def posts(request):
    # return json response of 10 posts
    start = int(request.GET.get("start"))
    end = int(request.GET.get("end"))
    user = request.GET.get("userid")
    if user:
        user = int(user)

    pagetype = request.GET.get("pagetype")
    print(pagetype)

    if pagetype == "allposts":
        posts = Post.objects.all().order_by('-timestamp')[start:end]

    elif pagetype == "following":
        user = request.user
        posts = Post.objects.filter(user__in=user.following.all()).order_by("-timestamp")[start:end]

    elif pagetype == "comments":
        postid = request.GET.get("postid")
        postid = int(postid)
        post = Post.objects.filter(id=postid).first()
        posts = post.comments.all().order_by("-timestamp")[start:end]

    elif pagetype == "replies":
        postid = request.GET.get("postid")
        postid = int(postid)
        post = Comment.objects.get(id=postid) #parent comment
        posts = post.replies.all().order_by("-timestamp")[start:end]

    elif pagetype == "search":
        query = request.GET.get("search")
        posts = Post.objects.filter(text__icontains=query).order_by("-timestamp")[start:end]
        print(posts)

    else: #profile
        user = User.objects.get(id=user)
        posts = user.posts.all().order_by("-timestamp")[start:end]
          
    posts = json.dumps([{'id': post.id,'user': post.user_id,'text': post.text,'timestamp': post.timestamp,'likes': list(post.likes.all().values_list('id', flat=True)),'username': post.user.username, 'images': list(post.images.all().values_list('image', flat=True)) }for post in posts],cls=DjangoJSONEncoder)

    return JsonResponse({
        "posts": posts,
    })
    
@csrf_exempt
def like(request):
    if request.method == "PUT":
        data = json.loads(request.body)
        post_id = data.get("posty")
        user = request.user

        post = Post.objects.filter(id=post_id).first()
        if post:
            if post in user.likes.all():
                user.likes.remove(post)
            else:
                user.likes.add(post)

        else:
            post = Comment.objects.get(id=post_id)
            if post in user.comment_likes.all():
                user.comment_likes.remove(post)
            else:
                user.comment_likes.add(post)

        return HttpResponse(status=204)
    
@csrf_exempt
def edit(request):
    if request.method == "PUT":
        data = json.loads(request.body)
        post_id = data.get("post")
        post = Post.objects.get(id=post_id)
        user = request.user
        if post.user == user:
            post.text = data.get("text")
            post.save()
            return HttpResponse(status=204)
        else:
            return HttpResponse(status=403)
        
@csrf_exempt
def follow(request):
    if request.method == "PUT":
        data = json.loads(request.body)
        user_id = data.get("user")
        user = User.objects.get(id=user_id)  #person who got followed or unfollowed
        current_user = request.user #person who did the followed or unfollowed

        if user in current_user.following.all():
            current_user.following.remove(user)
        else:
            current_user.following.add(user)

        return HttpResponse(status=204)
    
@login_required
def newpost(request):
    if request.method == "POST":
        if(request.POST.get("text")):
            user = request.user
            text = request.POST.get("text")
            post = Post(user=user, text=text)
            post.save()

            uploaded_file = request.FILES.getlist('images')
            for file in uploaded_file:
                if file:
                    instance = Image()
                    instance.post = post
                    instance.image = file
                    instance.save()

            posts = json.dumps({'id': post.id,'user': post.user_id,'text': post.text,'timestamp': post.timestamp,'likes': [],'username': post.user.username, 'images': list(post.images.all().values_list('image', flat=True))},cls=DjangoJSONEncoder)
            return JsonResponse({
                "newpost": posts,
            })
        
        else: # comment
            user = request.user
            text = request.POST.get("comment")
            post_id = request.POST.get("post")
            post_id = int(post_id)
            type = request.POST.get("type")
            
            if type == "comments":
                post = Post.objects.filter(id=post_id).first()
                comment = Comment(user=user, post=post, text=text)
                comment.save()
            else:
                post = Comment.objects.get(id=post_id)
                comment = Comment(user=user, parent_comment=post, text=text)
                comment.save()

            uploaded_file = request.FILES.getlist('images')
            for file in uploaded_file:
                if file:
                    instance = Image()
                    instance.comment = comment
                    instance.image = file
                    instance.save()

            posts = json.dumps({'id': comment.id,'user': comment.user_id,'text': comment.text,'timestamp': comment.timestamp,'likes': [],'username': comment.user.username, 'images': list(comment.images.all().values_list('image', flat=True))},cls=DjangoJSONEncoder)
            return JsonResponse({
                "newpost": posts,
            })
        
def search(request):
    query = request.GET.get("query")
    print(query)
    if query:
        users = User.objects.filter(username__icontains=query).exclude(id=request.user.id).order_by("username")[:5]
        return JsonResponse({
            "users": serialize("json", users),
        })
    
    return JsonResponse({
        "users": serialize("json",  []),
    })

def followSuggestions(request):
    #simple breadth first search 
    user = request.user
    following = [] #treating as visited
    following.append(user)
    suggestions = []
    queue = []
    queue.append(user)

    while queue:
        current = queue.pop(0) 
        for person in current.following.all():
            if person not in following and person not in suggestions:

                queue.append(person)
                following.append(person)
                if person in user.following.all():
                    continue 
                else:
                    suggestions.append(person)

                if len(suggestions) == 5:
                    break

    return JsonResponse({
        "suggestions": serialize("json", suggestions),
    })

def test(request):
    print(request.user.pk)
    return HttpResponse(status=204)

def profile(request):
    user = json.loads(request.body).get("userid")
    if user:
        user = User.objects.get(id=user)
    else:
        user = request.user

    # posts = json.dumps({'id': post.id,'user': post.user_id,'text': post.text,'timestamp': post.timestamp,'likes': [],'username': post.user.username, 'images': list(post.images.all().values_list('image', flat=True))},cls=DjangoJSONEncoder)
    user = json.dumps({'username': user.username, 'followers': user.followers.count(), 'following': user.following.count(), 'bio': user.description, 'pfp': user.profile_picture.name, "isFollowing": (request.user in user.following.all())},cls=DjangoJSONEncoder)

    return JsonResponse({
        "profile": user,
    })

        


