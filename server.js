var express = require('express');
var app = express();
app.set('view engine', 'ejs');

var bodyParser = require('body-parser')
var fileUpload = require('express-fileupload');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var ExifImage = require('exif').ExifImage;
var fs = require('fs');
var session = require('cookie-session');

var mongourl = "mongodb://g1141464:g1141464@ds141474.mlab.com:41474/g1141464";

var loginUser = {};
loginUser['userid'] = null;
loginUser['pw'] = null;

var SECRETKEY1 = 'I want to pass COMPS381F';
var SECRETKEY2 = 'Keep this to yourself';

app.use(session({
  name: 'session',
  keys: [SECRETKEY1,SECRETKEY2]
}));

app.use(fileUpload());
app.use(bodyParser());

app.listen(process.env.PORT || 8099);

app.get('/new', function(req,res) {
  if (!req.session.authenticated) {
		res.status(200);
    res.render("login");
	} else {
        res.status(200);
        res.render("upload",{owner: loginUser.userid});}
});

// app.get('/', function(req,res) {
//   res.redirect('/photos');
// });

app.get('/', function(req,res) {
  if (!req.session.authenticated) {
		res.status(200);
    res.render("login");
	} else {res.redirect('/read');}
});

app.post('/processlogin', function(req,res) {
  var userid = req.body.userid;
  var pw = (req.body.pw.length > 0) ? req.body.pw : null;
  console.log("user id = " + userid);
  console.log("pw = " + pw);
  var match = {};
  match['userid'] = userid;
  match['pw'] = pw;
  console.log(match);
  loginUser = match;
  console.log(loginUser);
  console.log(Date.now().toString());
  MongoClient.connect(mongourl, function(err, db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB\n');
    matchLogin(db,match,function(user) {
			db.close();
      console.log('Disconnected MongoDB\n');
			if (user.length == 0) {
        console.log('Login Failed');
        res.redirect('/logout');
			} else {
          if(loginUser.userid != null) {
            console.log('Now user = '+user[0].userid);
            req.session.authenticated = true;
            req.session.userid = loginUser.userid;
            res.redirect('/read');}
          else{res.redirect('/logout');}
          
      }

			
		}); 
})});

app.get('/read', function(req,res) {
  if (!req.session.authenticated ||loginUser.userid == null) {
		res.redirect('/logout');
	} else {
    loginUser['userid'] = req.session.userid = loginUser.userid;
  MongoClient.connect(mongourl, function(err, db) {
            assert.equal(err,null);
            console.log('Connected to MongoDB\n');
            findRestaurants(db,{},function(restaurants) {
              db.close();
              console.log('Disconnected MongoDB\n');
              console.log('No. of restaurants = '+restaurants.length);
              res.render("read", {user: loginUser,
                            restaurant: restaurants});
              return(restaurants);
              });
          });}
});

app.get('/logout',function(req,res) {
  req.session = null;
  console.log("user id <<" + loginUser.userid+ ">> Logouted~~");
	res.redirect('/');
});

app.get('/createAC', function(req,res) {
  res.status(200);
  res.render("createac");
});

app.post('/processcreateac', function(req,res) {
  var userid = req.body.userid;
  var pw = (req.body.pw.length > 0) ? req.body.pw : null;
  var newUser = {};
  newUser['userid'] = userid;
  newUser['pw'] = pw;
  console.log("user id = " + userid);
  console.log("pw = " + pw);
  MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		insertUser(db,newUser,function(result) {
      db.close();
  res.redirect('/');
})})});

app.get('/photos', function(req,res) {
  if (!req.session.authenticated) {
		res.status(200);
    res.render("login");
	} else {
  console.log('/photos');
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    findPhoto(db,{},{_id:1,title:1},function(photos) {
      db.close();
      console.log('Disconnected MongoDB');
      res.status(200);
      res.render("list",{p:photos});
    })
  });}
});

app.post('/fileupload', function(req,res) {
  if (!req.session.authenticated  ||loginUser.userid == null) {
		res.redirect('/logout');
	} else {
  if (req.files.filetoupload) var filename = req.files.filetoupload.name;
  var name = (req.body.name.length > 0) ? req.body.name : "untitled";
  if (req.files.filetoupload) var mimetype = req.files.filetoupload.mimetype;
  var new_r = {};
  new_r['id'] = Date.now().toString();
	new_r['name'] = req.body.name;
	new_r['borough'] = req.body.borough;
	new_r['cuisine'] = req.body.cuisine;
	var address = {};
	address['building'] = req.body.building;
  address['street'] = req.body.street;
  address['zipcode'] = req.body.zipcode;
  new_r['address'] = address;
  var gps ={};
  gps['coordlon'] = req.body.coordlon;
  gps['coordlat'] = req.body.coordlat;
  new_r['gps'] = gps;
  var grade =[];
  new_r['grade']=grade;
  new_r['owner'] = loginUser.userid;

  console.log(new_r);
  console.log("filename = " + filename);
  //
  
  var image = {};
  if (filename) image['image'] = filename;
  if (filename){
  fs.readFile(filename, function(err,data) {
    MongoClient.connect(mongourl,function(err,db) {
      new_r['mimetype'] = mimetype;
      new_r['image'] = new Buffer(data).toString('base64');
      //new_r['exif'] = exif;
      insertRestaurants(db,new_r,function(result) {
        db.close();
        res.status(200);
        res.write('Restaurant was inserted into MongoDB!');
        res.end('<a href="/read"><button class="btn btn-default">Go Back</button></a></body>');
      })
    });
  })}
  else{MongoClient.connect(mongourl,function(err,db) {
      new_r['image'] = image;
      //new_r['exif'] = exif;
      insertRestaurants(db,new_r,function(result) {
        db.close();
        res.redirect('/');})
  })
  }
}});

app.get('/display', function(req,res) {
  if (!req.session.authenticated ||loginUser.userid == null) {
		res.redirect('/logout');
	} else {
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    var criteria = {};
    criteria['_id'] = ObjectID(req.query._id);
    findRestaurants(db,criteria,function(restaurants) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('Photo returned = ' + restaurants.length);
      //if(restaurants[0].exif.gps) console.log('GPS = ' + JSON.stringify(restaurants[0].exif.gps));
      var lat = -1;
      var lon = -1;
      if (restaurants[0].gps.coordlon) lon = restaurants[0].gps.coordlon;
      if (restaurants[0].gps.coordlat) lat = restaurants[0].gps.coordlat;

      console.log(lat,lon); 
      console.log(restaurants[0].gps.coordlat, restaurants[0].gps.coordlon);  
      //console.log(restaurants[0]); 
      res.status(200);
      res.render("photo",{p:restaurants[0],lat:lat,lon:lon});
    });
  });}
});

app.get('/map', function(req,res) {
  if (!req.session.authenticated ||loginUser.userid == null) {
		res.redirect('/logout');
	}else {res.render('gmap.ejs',
             {lat:req.query.lat,lon:req.query.lon});}
});

app.get('/rate', function(req,res) {
  if (!req.session.authenticated ||loginUser.userid == null) {
    res.redirect('/logout');
	} else {MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    var criteria = {};
    criteria['_id'] = ObjectID(req.query._id);
    findRestaurants(db,criteria,function(restaurants) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('Photo returned = ' + restaurants.length);
      var rated = false;
      if (restaurants[0].grade){
        for (i in restaurants[0].grade){
        if (restaurants[0].grade[i].user == loginUser.userid){
          rated = true;
        }}
      }
    console.log('id = '+restaurants[0]._id);
    console.log(rated);
    if(rated){
      res.writeHead(200, {"Content-Type": "text/html"});
      res.write('<body>');
      res.write('<h1>User: '+loginUser.userid+' rated this restaurant!!!</h1><br>');
      res.end('<a href="/read"><button class="btn btn-default">Go Back</button></a></body>');
    }
    else {res.render('rateR.ejs',
             {p : restaurants[0],
              owner : loginUser.userid});}
             })})}
});

app.post('/processrate', function(req,res) {
  if (!req.session.authenticated ||loginUser.userid == null) {
		res.redirect('/logout');
	} else {
    var new_g = {};
    new_g['user'] = req.body.user;
    new_g['score'] = req.body.score;
    console.log('Processing rate...');
    console.log('req.body.id : '+req.body.id);
    MongoClient.connect(mongourl,function(err,db) {
      assert.equal(err,null);
      console.log('Connected to MongoDB\n');
      var criteria = {};
      criteria['_id'] = ObjectID(req.body.id);
      console.log('Preparing update: ' + JSON.stringify(new_g));
      rateRestaurant(db,criteria,new_g,function(result) {
        db.close();	
      });
    });
    res.redirect('/');
  }
});

app.get('/edit', function(req,res) {
  if (!req.session.authenticated ||loginUser.userid == null) {
		res.redirect('/logout');
	}else{ MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    var criteria = {};
    criteria['_id'] = ObjectID(req.query._id);
    findRestaurants(db,criteria,function(restaurants) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('Photo returned = ' + restaurants.length);
      var isowner = false;
      if (restaurants[0].owner == loginUser.userid){
        isowner = true;
      }
    console.log('id = '+restaurants[0]._id);
    if(!isowner){
      res.writeHead(200, {"Content-Type": "text/html"});
      res.write('<body>');
      res.write('<h1>User: '+loginUser.userid+' is not the owner of this restaurant!!!</h1><br>');
      res.write('<p>A restaurant can only be updated by its owner (i.e. the user who created the restaurant)</p><br>');
      res.end('<a href="/read"><button class="btn btn-default">Go Back</button></a></body>');
    }
    else {res.render('update.ejs',
             {p : restaurants[0],
              owner : loginUser.userid});}
             })})}
});

app.post('/processedit', function(req,res) {
  if (!req.session.authenticated ||loginUser.userid == null) {
		res.redirect('/logout');
	} else {
    
    console.log('About to update ' +  req.body.id);
    if (req.files.filetoupload) var filename = req.files.filetoupload.name;
    if (req.files.filetoupload) var mimetype = req.files.filetoupload.mimetype;
    var edititem = {};
    if (req.body.name) edititem['name'] = req.body.name;
    if (req.body.borough) edititem['borough'] = req.body.borough;
    if (req.body.cuisine) edititem['cuisine'] = req.body.cuisine;
    var address = {};
    if (req.body.building) address['building'] = req.body.building;
    if (req.body.street) address['street'] = req.body.street;
    if (req.body.zipcod) address['zipcode'] = req.body.zipcode;
    edititem['address'] = address;
    var gps ={};
    if (req.body.coordlon) gps['coordlon'] = req.body.coordlon;
    if (req.body.coordlat) gps['coordlat'] = req.body.coordlat;
    edititem['gps'] = gps;
  
    console.log("filename = " + filename);

    var image = {};
    if (filename) image['image'] = filename;
    if (filename){
    fs.readFile(filename, function(err,data) {
        edititem['mimetype'] = mimetype;
        edititem['image'] = new Buffer(data).toString('base64');
        })}
    MongoClient.connect(mongourl,function(err,db) {
      assert.equal(err,null);
      console.log('Connected to MongoDB\n');
      var criteria = {};
      criteria['_id'] = ObjectID(req.body.id);
      console.log('Preparing update: ' + JSON.stringify(edititem));
      updateRestaurant(db,criteria,edititem,function(result) {
        db.close();
        res.writeHead(200, {"Content-Type": "text/html"});
        res.write("<body><h1>update was successful!</h1><br>");
        res.end('<a href="/read"><button class="btn btn-default">Go Back</button></a></body>');			
      });
    });
  }
});

app.get('/delete', function(req,res) {
  if (!req.session.authenticated ||loginUser.userid == null) {
		res.redirect('/logout');
	}else{ 
    MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    var criteria = {};
    criteria['_id'] = ObjectID(req.query._id);
    findRestaurants(db,criteria,function(restaurants) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('Photo returned = ' + restaurants.length);
      var isowner = false;
      if (restaurants[0].owner == loginUser.userid){
        isowner = true;
      }
    console.log('id going to delete = '+restaurants[0]._id);
    if(!isowner){
      res.writeHead(200, {"Content-Type": "text/html"});
      res.write('<body>');
      res.write('<h1>User: '+loginUser.userid+' is not the owner of this restaurant!!!</h1><br>');
      res.write('<p>A restaurant can only be deleted by its owner (i.e. the user who created the restaurant)</p><br>');
      res.end('<a href="/read"><button class="btn btn-default">Go Back</button></a></body>');
    }
    else {
      MongoClient.connect(mongourl,function(err,db) {
        assert.equal(err,null);
        console.log('Connected to MongoDB\n');
        deleteRestaurant(db,criteria,function(result) {
          db.close();
          console.log(JSON.stringify(result));			
          res.writeHead(200, {"Content-Type": "text/html"});
          res.write('<body><h1>delete was successful!</h1><br>');
          res.end('<a href="/read"><button class="btn btn-default">Go Back</button></a></body>');
        });
      });
    }
             })})}
});

app.get('/search', function(req,res) {
  if (!req.session.authenticated ||loginUser.userid == null) {
		res.redirect('/logout');
	}else {res.render('searchform.ejs');}
});

app.post('/processsearch', function(req,res) {
  if (!req.session.authenticated ||loginUser.userid == null) {
		res.redirect('/logout');
	} else {
    console.log('About to search restaurants with name =' +  req.body.name);
    var searchitem = {};
    if (req.body.rid) searchitem['id'] = req.body.rid;
    if (req.body.name) searchitem['name'] = req.body.name;
    if (req.body.borough) searchitem['borough'] = req.body.borough;
    if (req.body.cuisine) searchitem['cuisine'] = req.body.cuisine;
    var address = {};
    if (req.body.building) address['building'] = req.body.building;
    if (req.body.street) address['street'] = req.body.street;
    if (req.body.zipcode) address['zipcode'] = req.body.zipcode;
    if (address.building || address.street || address.zipcode) searchitem['address'] = address;
    var gps ={};
    if (req.body.coordlon) gps['coordlon'] = req.body.coordlon;
    if (req.body.coordlat) gps['coordlat'] = req.body.coordlat;
    if (gps.coordlon && gps.coordlat) searchitem['gps'] = gps;

    console.log('searchitem =' +  JSON.stringify(searchitem));

    MongoClient.connect(mongourl, function(err,db) {
      assert.equal(err,null);
      console.log('Connected to MongoDB');
      findRestaurants(db,searchitem,function(restaurants) {
        db.close();
        console.log('Disconnected MongoDB');
        console.log('restaurants returned = ' + restaurants.length);
        res.status(200);
        res.render('searchresult.ejs',{p:restaurants});
      });
    });
  }
});


function insertRestaurants(db,r,callback) {
  db.collection('restaurants').insertOne(r,function(err,result) {
    assert.equal(err,null);
    console.log("insert was successful!");
    console.log(JSON.stringify(result));
    callback(result);
  });
}

function deleteRestaurant(db,criteria,callback) {
  db.collection('restaurants').deleteMany(criteria,function(err,result) {
    assert.equal(err,null);
    console.log("delete was successful!");
    console.log(JSON.stringify(result));
    callback(result);
  });
}

function findPhoto(db,criteria,fields,callback) {
  var cursor = db.collection("restaurants").find(criteria);
  var photos = [];
  cursor.each(function(err,doc) {
    assert.equal(err,null);
    if (doc != null) {
      photos.push(doc);
    } else {
      callback(photos);
    }
  });
}

function matchLogin(db,match,callback) {
	var user = [];
  cursor = db.collection('user').find(match); 			
	cursor.each(function(err, doc) {
		assert.equal(err, null); 
		if (doc != null) {
			user.push(doc);
		} else {
			callback(user); 
		}
	});
}



function findRestaurants(db,criteria,callback) {
	var restaurants = [];
  cursor = db.collection('restaurants').find(criteria); 
	cursor.each(function(err, doc) {
		assert.equal(err, null); 
		if (doc != null) {
			restaurants.push(doc);
		} else {
			callback(restaurants); 
		}
	});
}

function insertUser(db,newUser,callback) {
	db.collection('user').insertOne(newUser,function(err,result) {
		assert.equal(err,null);
		console.log("Insert was successful!");
		console.log(JSON.stringify(result));
		callback(result);
	});
}

function rateRestaurant(db,criteria,newValues,callback) {
	db.collection('restaurants').updateOne(
		criteria,{ $push: { grade: newValues } },function(err,result) {
			assert.equal(err,null);
			console.log("update was successfully");
			callback(result);
	});
}

function updateRestaurant(db,criteria,edititem,callback) {
	db.collection('restaurants').updateOne(
		criteria,{$set: edititem},function(err,result) {
			assert.equal(err,null);
			console.log("update was successfully");
			callback(result);
	});
}

//RESTful Part/////////////////////////////////////////////////////////////////////////////////////
//RESTful Part/////////////////////////////////////////////////////////////////////////////////////
//RESTful Part/////////////////////////////////////////////////////////////////////////////////////
app.get('/api/restaurant/read/name*?/:name*?/borough*?/:borough*?/cuisine*?/:cuisine*?', function(req,res) {
  var item = {};
  if (req.params.name) item['name'] = req.params.name;
  if (req.params.borough) item['borough'] = req.params.borough;
  if (req.params.cuisine) item['cuisine'] = req.params.cuisine;
  console.log(JSON.stringify(item));
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    findRestaurants(db,item,function(restaurants) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('restaurants returned = ' + restaurants.length);
    	
        res.status(200).json(restaurants);

    });
  });
});

app.get('/api/restaurant/read/name/:name', function(req,res) {
  var item = {};
  item['name'] = req.params.name;
  console.log(JSON.stringify(item));
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    findRestaurants(db,item,function(restaurants) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('restaurants returned = ' + restaurants.length);
    	
        res.status(200).json(restaurants);

    });
  });
});

app.get('/api/restaurant/read/borough/:borough', function(req,res) {
  var item = {};
  item['borough'] = req.params.borough;
  console.log(JSON.stringify(item));
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    findRestaurants(db,item,function(restaurants) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('restaurants returned = ' + restaurants.length);
    	
        res.status(200).json(restaurants);

    });
  });
});

app.get('/api/restaurant/read/cuisine/:cuisine', function(req,res) {
  var item = {};
  item['cuisine'] = req.params.cuisine;
  console.log(JSON.stringify(item));
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    findRestaurants(db,item,function(restaurants) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('restaurants returned = ' + restaurants.length);
    	
        res.status(200).json(restaurants);

    });
  });
});

app.get('/api/restaurant/read/name/:name/borough/:borough', function(req,res) {
  var item = {};
  item['name'] = req.params.name;
  item['borough'] = req.params.borough;
  console.log(JSON.stringify(item));
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    findRestaurants(db,item,function(restaurants) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('restaurants returned = ' + restaurants.length);
    	
        res.status(200).json(restaurants);

    });
  });
});

app.get('/api/restaurant/read/name/:name/cuisine/:cuisine', function(req,res) {
  var item = {};
  item['name'] = req.params.name;
  item['cuisine'] = req.params.cuisine;
  console.log(JSON.stringify(item));
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    findRestaurants(db,item,function(restaurants) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('restaurants returned = ' + restaurants.length);
    	
        res.status(200).json(restaurants);

    });
  });
});

app.get('/api/restaurant/read/borough/:borough/cuisine/:cuisine', function(req,res) {
  var item = {};
  item['borough'] = req.params.borough;
  item['cuisine'] = req.params.cuisine;
  console.log(JSON.stringify(item));
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    findRestaurants(db,item,function(restaurants) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('restaurants returned = ' + restaurants.length);
    	
        res.status(200).json(restaurants);

    });
  });
});

app.get('/api/restaurant/read', function(req,res) {
  var item = {};
  console.log(JSON.stringify(item));
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    findRestaurants(db,item,function(restaurants) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('restaurants returned = ' + restaurants.length);
    	
        res.status(200).json(restaurants);

    });
  });
});



//server.listen(process.env.PORT || 8099);
