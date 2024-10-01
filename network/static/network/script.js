const { BrowserRouter, Route, Link, Switch, useHistory, useParams, useLocation, withRouter, useSearchParams} = ReactRouterDOM;

// Function to get CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// problem: dealing with new posts and how to render them, ties into what gets saved on fetches...
function App({match}) {

    const [allPosts, setAllPosts] = React.useState([]);
    const [userPosts, setUserPosts] = React.useState([]);
    const [followingPosts, setFollowingPosts] = React.useState([]);
    const [comments, setComments] = React.useState([]);
    const [pageType, setPagetype] = React.useState("allposts");
    const [loading, setLoading] = React.useState(false);
    const [searchPosts, setSearchPosts] = React.useState([]);
    const location = useLocation(); // If using React Router

    const postsPerPage = 10;

    const fetchPosts = (type, start) => {
        setLoading(true);
        let link = `/posts?start=${start}&end=${start + postsPerPage}&pagetype=${type}`;

        if (type === "profile") {
            const userid = window.location.href.split("/").pop();
            link += `&userid=${userid}`;
        }

        else if(type === "comments" || type === "replies") {
            const postid = window.location.href.split("/").pop();
            link += `&postid=${postid}`;
        }

        else if(type === "search")
        {
            const searchparams = new URLSearchParams(window.location.search);
            link += `&search=${searchparams.get("q")}`;
        }

        fetch(link)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                const newPosts = JSON.parse(data.posts);
                switch(type) {
                    case "allposts":
                        setAllPosts(prev => [...prev, ...newPosts]);
                        break;
                    case "profile":
                        setUserPosts(prev => [...prev, ...newPosts]);
                        break;
                    case "following":
                        setFollowingPosts(prev => [...prev, ...newPosts]);
                        break;
                    case "search":
                        setSearchPosts(prev => [...prev, ...newPosts]);
                        break;
                    case "comments":
                    case "replies":
                        setComments(prev => [...prev, ...newPosts]);
                        break;
                }
                setLoading(false);
            })
            .catch(error => {
                console.error('Fetch error:', error);
                setLoading(false);
            });
    };

    const handleScroll = () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
        fetchPosts(pageType, getCurrentPosts().length);
        }
    };

    React.useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loading, pageType]);

    const isHandlingPopstate = React.useRef(false);

    React.useEffect(() => {
        const handlePopstate = () => {
            if (location.state) {
                isHandlingPopstate.current = true;
                setPagetype(location.state.prevPage);

                setUserPosts([]);
                setComments([]);

                const pt = location.state.prevPage;
            
                if (getCurrentPosts(pt).length === 0 || pt === "profile" || pt === "comments" || pt === "replies") {
                    fetchPosts(pt, 0);
                }

                isHandlingPopstate.current = false;
            }
        };
        window.addEventListener('popstate', handlePopstate);
        return () => window.removeEventListener('popstate', handlePopstate);
    }, [location]);
    
    React.useEffect(() => {
        if (isHandlingPopstate.current) {
            return; // Skip the initial run of this effect if it's due to popstate handling
        }
        
        setUserPosts([]);
        setComments([]);
    
        if (getCurrentPosts().length === 0 || pageType === "profile" || pageType === "comments" || pageType === "replies") {
            fetchPosts(pageType, 0);
        }
    }, [pageType, location.pathname]);


    const getCurrentPosts = (pt) => {
        switch(pt ? pt : pageType) {
            case "allposts": return allPosts;
            case "profile": return userPosts;
            case "following": return followingPosts;
            case "search": return searchPosts;
            case "comments":
            case "replies": return comments;
            default: return [];
        }
    };

    const createNewPost = (content, images) => {
        const formData = new FormData();
        formData.append(pageType === "comments" || pageType === "replies" ? "comment" : "text", content);
        if(pageType === "comments" || pageType === "replies") {
            const postid = window.location.href.split("/").pop();
            formData.append("post", postid);
            formData.append("type", pageType);
        }
        images.forEach(image => formData.append('images', image.file));

        const csrftoken = getCookie('csrftoken');
        fetch('/newpost/', {
            method: 'POST',
            body: formData,
            headers: { 
                'X-CSRFToken': csrftoken
            }
        }).then(response => response.json())
          .then(data => {
            data = JSON.parse(data.newpost);
            if(pageType === "comments" || pageType === "replies") {
                setComments(prev => [data, ...prev]);
            }

            else{
                setAllPosts(prev => [data, ...prev]);
                setFollowingPosts(prev => [data, ...prev]);
            }

          })
          .catch(error => console.error('Error creating post:', error));
    };
 
    return (
        <>
        <nav className="navbar navbar-expand-lg navbar-dark navbar-custom">
            <a className="navbar-brand" href="#">Network</a>
          
            <div>
              <ul className="navbar-nav mr-auto">
                {serverData.authentication && (<li className="nav-item">
                        <Link className="nav-link" to={{pathname: `/${serverData.userid}`, state: {prevPage: pageType}}} onClick={() => {setPagetype("profile");}}>{serverData.user}</Link>
                    </li>)}
                <li className="nav-item">
                  <Link className="nav-link" to={`/`} onClick={() => {setPagetype("allposts");}}>All Posts</Link>
                </li>
                {serverData.authentication ? (<>
                    <li className="nav-item">
                        <Link className="nav-link" to={`/`} onClick={() => {setPagetype("following");}}>Following</Link>
                    </li>
                    <li className="nav-item">
                        <a className="nav-link" href="/logout">Log Out</a>
                    </li>
                    </>) : (<>
                    <li className="nav-item">
                        <a className="nav-link" href="/login">Log In</a>
                    </li>
                    <li className="nav-item">
                        <a className="nav-link" href="/register">Register</a>
                    </li>
                    </>)}
              </ul>
            </div>
          </nav>

          <div id="content-container">

                <div className="column" style={{flex: 1}}>
 
                </div>

                <hr></hr>
                <div id="posts">
                    <Switch>
                        <Route exact path="/search" component={SearchHeader}></Route>
                        <Route exact path="/post/:id" component={CommentSection}></Route>
                        <Route exact path="/:id" render={(props) => <Profile {...props} setUserPosts={setUserPosts} />} />
                    </Switch>
                    {pageType !== "profile" && pageType !== "search"? <CreatePost onNewPost={createNewPost} pageType={pageType} /> : null}
                    {/* <CreatePost onNewPost={createNewPost} pageType={pageType} /> */}
                    <Feed posts={getCurrentPosts()} setPagetype={setPagetype} pageType={pageType} setComments = {setComments} fetchPosts={fetchPosts}/>
                </div>

                <div className="column" style={{flex: 1}}>
                    <Search setPagetype={setPagetype} pageType={pageType}/>
                    <Suggestions setPagetype={setPagetype} pageType={pageType}/>

                </div>

          </div>
          </>
    );
}

function Suggestions({setPagetype, pageType} = props) {

    const [suggestions, setSuggestions] = React.useState([]);

    React.useEffect(() => {
        fetch('/suggestFollow/')
        .then(response => response.json())
        .then(data => {
            data = JSON.parse(data.suggestions);
            setSuggestions(data);
        })
    }, []);

    return(
    <>
        <h2>Who to follow</h2>
        <div id="suggestions" className="suggestions">
            {suggestions.map(user => (
                <SearchResult key={user.pk} user={user} setPagetype={setPagetype} pageType={pageType}/>
            ))}
        </div>
    </>
    );
}

function SearchHeader() {
    return(
        <div className="card">
            <div className="card-body navbar-custom">  
                <button>Back</button>
                <h2>People</h2>
                <div id="searchPeople">

                </div>
            </div>
         </div>
    )
}

function Search({setPagetype, pageType} = props) {

    const [search, setSearch] = React.useState("");
    const [users, setUsers] = React.useState([]);
    const [showDropdown, setShowDropdown] = React.useState(false);
    const history = useHistory();
    const searchRef = React.useRef(null);

    React.useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    function searchFunction(event) {

        if(event.key == "Enter")
        {
            history.push(`/search?q=${search}`, {prevPage: pageType});
            setUsers([]);
            setShowDropdown(false);
            // setSearch("");
            setPagetype("search");
            return;
        }

        fetch('/search?query=' + search)
        .then(response => response.json())
        .then(data => {
            data = JSON.parse(data.users);
            setUsers(data);
        })
        setShowDropdown(true);

    }

    return (
        <div ref={searchRef}>
            <input type="text"  onClick={(event) => {event.stopPropagation(); setShowDropdown(true)}}value={search} onKeyUp={searchFunction} onChange={(event) => {setSearch(event.target.value)}} id="search" className="form-control" placeholder="Search" style={{backgroundColor: 'black', color: 'white'}}></input>
            {showDropdown && users.length > 0 && (
                <div className="dropdown" style={{ display: 'block' }}>
                    {users.map(user => (
                        <SearchResult key={user.pk} user={user} setPagetype={setPagetype} pageType={pageType} />
                    ))}
                </div>
            )}
        </div>
    );
}

function SearchResult({user, setPagetype, pageType} = props)
{
    const history = useHistory();

    function goProfile() {
        history.push(`/${user.pk}`, {prevPage: pageType});
        setPagetype("profile");
    }

    return (
        <div className="card" onClick={goProfile}>
            <div className="card-body navbar-custom header" id="searchUser" data-id={user.pk}> 
                <div className="pfp-container" style={{width: '50px', height: '50px'}}>
                    <img src={`/media/images/${user.fields.profile_picture}`} className="circular-image"></img>
                </div>
                <h5 className="card-title">{user.fields.username}</h5>
            </div>
        </div>
    );
}

function Profile ({match, setUserPosts} = props) {

    const [profile, setProfile] = React.useState({});
    const csrftoken = getCookie('csrftoken');

    React.useEffect(() => {
        const userid = match.params.id;

        fetch('/profile/', {
            method: 'POST',
            body: JSON.stringify({
                userid: userid
            }),
            headers: { 
                'X-CSRFToken': csrftoken,
                'Content-Type': 'application/json'
            }
        }).then(response => response.json())
        .then(data => {
            data = JSON.parse(data.profile);
            setProfile(data);
        })
    }, [match.params.id]);

    return (
        <div className="card">
            <div className="card-body navbar-custom">   
                <div>
                    <div className="header">
                        <div className="pfp-container">
                            <img src={`/media/images/${profile.pfp}`} className="circular-image"/>
                        </div>
                        <h2 style={{marginLeft: '2%'}}>{profile.username}</h2>

                        <button className="btn btn-primary top-right-button" id="follow" onClick={() => {

                            fetch('/follow/', {
                                method: 'PUT',
                                body: JSON.stringify({
                                    user: userid
                                }),
                            })

                            setProfile(prev => {
                                return {
                                    ...prev,
                                    isFollowing: !prev.isFollowing,
                                    followers: prev.isFollowing ? prev.followers - 1 : prev.followers + 1
                                }
                            })
                        }}>{profile.isFollowing ? "unfollow" : "follow"}</button>
                    </div>

                    <div>
                        <p>{profile.bio}</p>
                    </div>
        
                    <div className="follow">
                        <h3>Followers: {profile.followers}</h3>
                        <h3>Following: {profile.following}</h3>
                    </div>
                </div> 
            </div>
        </div>

    );
    
}

function Feed({posts, setPagetype, pageType, setComments, fetchPosts} = props) {
    return (
        <div>
            {posts.map(post => (
                <Post key={post.id} contents={post} setPagetype={setPagetype} pageType={pageType} setComments={setComments} fetchPosts={fetchPosts}/>
            ))}
        </div>
    );
}

function CommentSection({match}) {
    const history = useHistory();
    const [post, setPost] = React.useState(history.location.state?.post || null);

    React.useEffect(() => {
        setPost(history.location.state?.post || null);
    });

    return (
        <Post key={post.id} contents={post} />
    )
}


function Post({contents, setPagetype, pageType, setComments, fetchPosts} = props) {

    const [type, setType] = React.useState("reg");
    const [postContent, setPostContent] = React.useState(contents);
    const history = useHistory();

    function comment() {
        history.push(`/post/${postContent.id}`, {post: postContent, prevPage: pageType});
        pageType == "comments" ? setPagetype("replies") : setPagetype("comments");
    }

    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        const formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: 'numeric' 
        });
        return formattedDate;
    }
    
    return (
        <div className='card' onClick={comment}>
            <div className="card-body navbar-custom" id="comment">     
                <h5 className="card-title invis">
                        <Link to={{pathname: `/${postContent.user}`, state: {prevPage: pageType}}} onClick={(event) => {event.stopPropagation(); setPagetype("profile")}}>{postContent.username}</Link>
                    <small className="text-muted" >{formatTimestamp(postContent.timestamp)}</small>
                </h5>
                {type == "edit" ? <textarea className="form-control" value={postContent.text} onClick={(event) => {event.stopPropagation()}} onChange={(event) => setPostContent({...postContent, text: event.target.value})}></textarea> : <p className="card-text invis">{postContent.text}</p>}
                <div id="selectedImagesContainer" className="image-container">
                    {postContent.images.map((link, index) => (
                        <img key={index} src={`/media/images/${link}`} alt={`Image ${index + 1}`}/>
                    ))}
                </div>
                <div className="invis">
                    {parseInt(serverData.userid) == parseInt(postContent.user) ? <button id="edit" className="btn btn-primary" onClick={(event) => {
                    event.stopPropagation();    
                    if (type == "edit") {
                        fetch(`/edit/`, {
                            method: 'PUT',
                            body: JSON.stringify({
                                post: postContent.id,
                                text: postContent.text
                            })
                        })
                    }
                       
                    type == "reg" ? setType("edit") : setType("reg");

                    }}>{type == "reg" ? "Edit" : "Save"}</button> : null}

                    <button id="likebutton" className="btnd">
                        <LikeButton post_likes={postContent.likes} user={parseInt(serverData.userid)} postid={postContent.id} setPostContent={setPostContent}/>
                    </button>

                </div>
            </div>
        </div>
    );
}

function LikeButton({post_likes, user, postid, setPostContent} = props) {
    const [liked, setLiked] = React.useState(post_likes.includes(user));
    const [likes, setLikes] = React.useState(post_likes.length);
    return (
        <>
            <i className={`far fa-heart heart-button ${liked ? 'fas' : ''}`} style={{color: liked ? 'red' : 'gray'}} onClick={(event) => {
                    event.stopPropagation();
                    setLiked(!liked);
                    setLikes(liked ? likes - 1 : likes + 1);
                    setPostContent(prev => {
                        return {
                            ...prev,
                            likes: liked ? prev.likes.filter(id => id != user) : [...prev.likes, user]
                        }
                    });

                    fetch(`/like/`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            posty: parseInt(postid)
                        })
                    })
                }}></i>
            {likes}
        </>
    );
}

function CreatePost({ onNewPost, pageType }) {
    const [content, setContent] = React.useState('');
    const [images, setImages] = React.useState([]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (content.trim()) {
            onNewPost(content, images);
            setContent('');
            setImages([]);
        }
    };

    const handleImages = (e) => {
        const files = Array.from(e.target.files);
        const newImages = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        setImages(prevImages => [...prevImages, ...newImages]);
    }

    return (
        <div className="card">
            <div className="card-body navbar-custom">   
                <form action="/newpost/" method="post" encType="multipart/form-data" onSubmit={handleSubmit}>
                    <textarea className="form-control navbar-custom" name="text" value={content} id="post" cols="" rows="5" placeholder="What's happening?" onChange={(e) => setContent(e.target.value)}></textarea>
                    <div id="selectedImagesContainer" className="image-container">
                        {images.map((image, index) => (
                            <img key={index} src={image.preview} alt={`Image ${index + 1}` } style={{maxWidth: '100%', maxHeight: '100px', margin: '5px'}}/>
                        ))}
                    </div>
                    <hr style={{backgroundColor: 'gray'}}></hr>
                    <label htmlFor="images" className="custom-button">Choose an Image</label>
                    <input type="file" id="images" name="images"accept="image/*" onChange={handleImages} style={{display: 'none'}} multiple/>            
                    <button className="btn btn-primary" type="submit">{pageType === "comments" || pageType ==="replies" ? "reply" : "post"}</button>
                </form>
            </div>
        </div>
    );
}

ReactDOM.render(
                <BrowserRouter>
                <App />
                </BrowserRouter>
                , document.querySelector('#body'));

