
var express = require('express');
var app = express();
app.set('view engine', 'ejs');

var bodyParser = require('body-parser')
var fileUpload = require('express-fileupload');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
// var ExifImage = require('exif').ExifImage;
var fs = require('fs');
var session = require('cookie-session');

var mongourl = "mongodb://g1141464:g1141464@ds141474.mlab.com:41474/g1141464";
var gmapkey ="AIzaSyBu-916DdpKAjTmJNIgngS6HL_kDIKU0aU";

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
        var mes = [];
              mes[0] = 'Userid or password not correct!!!!!';
              res.render("message",{m:mes});
			} else {
          if(loginUser.userid != null) {
            console.log('Now user = '+user[0].userid);
            req.session.authenticated = true;
            req.session.userid = loginUser.userid;
            res.redirect('/read');}
          else{ var mes = [];
              mes[0] = 'Userid or password not correct!!!!!';
              res.render("message",{m:mes});}
          
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
  var isexist = false;
  var mes = [];
  var match = {};
  match['userid'] = newUser['userid'];
  MongoClient.connect(mongourl, function(err, db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB\n');
    matchLogin(db,match,function(user) {
			db.close();
      console.log('Disconnected MongoDB\n');
      console.log(user.length);
			if (user.length > 0) {
        mes[0] = 'This userid existed!!';
        mes[1] = 'Please enter another userid!!';
        res.render("message",{m:mes});
        }
      else{
        console.log("user id = " + userid);
    console.log("pw = " + pw);
  MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		insertUser(db,newUser,function(result) {
      db.close();
  mes[0] = 'Account created!';
  res.render("message",{m:mes});
    })})
      }
		}); 
});
  
    

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
  
  var image = {};
  if (filename) image['image'] = filename;
  if (filename){
  fs.readFile(filename, function(err,data) {
    MongoClient.connect(mongourl,function(err,db) {
      new_r['mimetype'] = mimetype;
      new_r['image'] = new Buffer(data).toString('base64');
      insertRestaurants(db,new_r,function(result) {
        db.close();
        res.status(200);
        var mes =[];
        mes[0] = 'Restaurant was inserted into MongoDB!';
        res.render("message",{m:mes});
      })
    });
  })}
  else{MongoClient.connect(mongourl,function(err,db) {
      new_r['image'] = image;
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
      var lat = -1;
      var lon = -1;
      if (restaurants[0].gps.coordlon) lon = restaurants[0].gps.coordlon;
      if (restaurants[0].gps.coordlat) lat = restaurants[0].gps.coordlat;

      console.log(lat,lon); 
      console.log(restaurants[0].gps.coordlat, restaurants[0].gps.coordlon);  
      //console.log(restaurants[0]); 
      res.status(200);
      res.render("display",{p:restaurants[0],lat:lat,lon:lon});
    });
  });}
});

app.get('/map', function(req,res) {
  if (!req.session.authenticated ||loginUser.userid == null) {
		res.redirect('/logout');
	}else {res.render('gmap.ejs',
             {lat:req.query.lat,lon:req.query.lon,k:gmapkey});}
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
      var mes =[];
      mes[0] = 'User: '+loginUser.userid+' rated this restaurant!!!';
      res.render("message",{m:mes});
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
      var mes =[];
      mes[0] = 'User: '+loginUser.userid+' is not the owner of this restaurant!!!';
      mes[1] = 'A restaurant can only be updated by its owner (i.e. the user who created the restaurant)';
      res.render("message",{m:mes});
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
        var mes =[];
        mes[0] = 'update was successful!';
        res.render("message",{m:mes});
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
      var mes =[];
      mes[0] = 'User: '+loginUser.userid+' is not the owner of this restaurant!!!';
      mes[1] = 'A restaurant can only be deleted by its owner (i.e. the user who created the restaurant)';
      res.render("message",{m:mes});
      }
    else {
      MongoClient.connect(mongourl,function(err,db) {
        assert.equal(err,null);
        console.log('Connected to MongoDB\n');
        deleteRestaurant(db,criteria,function(result) {
          db.close();
          console.log(JSON.stringify(result));			
          var mes =[];
          mes[0] = 'delete was successful!';
          res.render("message",{m:mes});
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
    if (req.body.building) searchitem["address.building"] = req.body.building;
    if (req.body.street) searchitem["address.street"] = req.body.street;
    if (req.body.zipcode) searchitem["address.zipcode"] = req.body.zipcode;
    var gps ={};
    if (req.body.coordlon) gps['coordlon'] = req.body.coordlon;
    if (req.body.coordlat) gps['coordlat'] = req.body.coordlat;
    if (gps.coordlon && gps.coordlat) searchitem['gps'] = gps;
    if (req.body.owner) searchitem['owner'] = req.body.owner;

    console.log('searchitem =' +  JSON.stringify(searchitem));

    MongoClient.connect(mongourl, function(err,db) {
      assert.equal(err,null);
      console.log('Connected to MongoDB');
      findRestaurants(db,searchitem,function(restaurants) {
        db.close();
        console.log('Disconnected MongoDB');
        console.log('restaurants returned = ' + restaurants.length);
        res.status(200);
        res.render('searchresult.ejs',{p:restaurants, c:JSON.stringify(searchitem)});
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

function matchLogin(db,match,callback) {
  var user = [];
  console.log(match);
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

//RESTful Part//////////////////////////////////////////////////////////////////////////////////////////////

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

app.get('/api/restaurant/read/:c1/:cv1', function(req,res) {
  var item = {};
  if (req.params.c1 == 'building' || req.params.c1 == 'street'|| req.params.c1 == 'zipcode'){
    item["address."+req.params.c1] = req.params.cv1;
  }else{
     item[req.params.c1] = req.params.cv1;
  }
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

app.get('/api/restaurant/read/:c1/:cv1/:c2/:cv2', function(req,res) {
  var item = {};
  if (req.params.c1 == 'building' || req.params.c1 == 'street'|| req.params.c1 == 'zipcode'){
    item["address."+req.params.c1] = req.params.cv1;
  }else{
     item[req.params.c1] = req.params.cv1;
  }
  if (req.params.c2 == 'building' || req.params.c2 == 'street'|| req.params.c2 == 'zipcode'){
    item["address."+req.params.c2] = req.params.cv2;
  }else{
     item[req.params.c2] = req.params.cv2;
  }
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

app.get('/api/restaurant/read/:c1/:cv1/:c2/:cv2/:c3/:cv3', function(req,res) {
  var item = {};
  if (req.params.c1 == 'building' || req.params.c1 == 'street'|| req.params.c1 == 'zipcode'){
    item["address."+req.params.c1] = req.params.cv1;
  }else{
     item[req.params.c1] = req.params.cv1;
  }
  if (req.params.c2 == 'building' || req.params.c2 == 'street'|| req.params.c2 == 'zipcode'){
    item["address."+req.params.c2] = req.params.cv2;
  }else{
     item[req.params.c2] = req.params.cv2;
  }
  if (req.params.c3 == 'building' || req.params.c3 == 'street'|| req.params.c3 == 'zipcode'){
    item["address."+req.params.c3] = req.params.cv3;
  }else{
     item[req.params.c3] = req.params.cv3;
  }
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

app.get('/api/restaurant/read/:c1/:cv1/:c2/:cv2/:c3/:cv3/:c4/:cv4', function(req,res) {
  var item = {};
  if (req.params.c1 == 'building' || req.params.c1 == 'street'|| req.params.c1 == 'zipcode'){
    item["address."+req.params.c1] = req.params.cv1;
  }else{
     item[req.params.c1] = req.params.cv1;
  }
  if (req.params.c2 == 'building' || req.params.c2 == 'street'|| req.params.c2 == 'zipcode'){
    item["address."+req.params.c2] = req.params.cv2;
  }else{
     item[req.params.c2] = req.params.cv2;
  }if (req.params.c3 == 'building' || req.params.c3 == 'street'|| req.params.c3 == 'zipcode'){
    item["address."+req.params.c3] = req.params.cv3;
  }else{
     item[req.params.c3] = req.params.cv3;
  }
  if (req.params.c4 == 'building' || req.params.c4 == 'street'|| req.params.c4 == 'zipcode'){
    item["address."+req.params.c4] = req.params.cv4;
  }else{
     item[req.params.c4] = req.params.cv4;
  }
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

app.get('/api/restaurant/read/:c1/:cv1/:c2/:cv2/:c3/:cv3/:c4/:cv4/:c5/:cv5', function(req,res) {
  var item = {};
  if (req.params.c1 == 'building' || req.params.c1 == 'street'|| req.params.c1 == 'zipcode'){
    item["address."+req.params.c1] = req.params.cv1;
  }else{
     item[req.params.c1] = req.params.cv1;
  }
  if (req.params.c2 == 'building' || req.params.c2 == 'street'|| req.params.c2 == 'zipcode'){
    item["address."+req.params.c2] = req.params.cv2;
  }else{
     item[req.params.c2] = req.params.cv2;
  }if (req.params.c3 == 'building' || req.params.c3 == 'street'|| req.params.c3 == 'zipcode'){
    item["address."+req.params.c3] = req.params.cv3;
  }else{
     item[req.params.c3] = req.params.cv3;
  }
  if (req.params.c4 == 'building' || req.params.c4 == 'street'|| req.params.c4 == 'zipcode'){
    item["address."+req.params.c4] = req.params.cv4;
  }else{
     item[req.params.c4] = req.params.cv4;
  }
   if (req.params.c5 == 'building' || req.params.c5 == 'street'|| req.params.c5 == 'zipcode'){
    item["address."+req.params.c5] = req.params.cv5;
  }else{
     item[req.params.c5] = req.params.cv5;
  }
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

app.get('/api/restaurant/read/:c1/:cv1/:c2/:cv2/:c3/:cv3/:c4/:cv4/:c5/:cv5/:c6/:cv6', function(req,res) {
  var item = {};
  if (req.params.c1 == 'building' || req.params.c1 == 'street'|| req.params.c1 == 'zipcode'){
    item["address."+req.params.c1] = req.params.cv1;
  }else{
     item[req.params.c1] = req.params.cv1;
  }
  if (req.params.c2 == 'building' || req.params.c2 == 'street'|| req.params.c2 == 'zipcode'){
    item["address."+req.params.c2] = req.params.cv2;
  }else{
     item[req.params.c2] = req.params.cv2;
  }if (req.params.c3 == 'building' || req.params.c3 == 'street'|| req.params.c3 == 'zipcode'){
    item["address."+req.params.c3] = req.params.cv3;
  }else{
     item[req.params.c3] = req.params.cv3;
  }
  if (req.params.c4 == 'building' || req.params.c4 == 'street'|| req.params.c4 == 'zipcode'){
    item["address."+req.params.c4] = req.params.cv4;
  }else{
     item[req.params.c4] = req.params.cv4;
  }
   if (req.params.c5 == 'building' || req.params.c5 == 'street'|| req.params.c5 == 'zipcode'){
    item["address."+req.params.c5] = req.params.cv5;
  }else{
     item[req.params.c5] = req.params.cv5;
  }
    if (req.params.c6 == 'building' || req.params.c6 == 'street'|| req.params.c6 == 'zipcode'){
    item["address."+req.params.c6] = req.params.cv6;
  }else{
     item[req.params.c6] = req.params.cv6;
  }
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

app.get('/api/restaurant/read/:c1/:cv1/:c2/:cv2/:c3/:cv3/:c4/:cv4/:c5/:cv5/:c6/:cv6/:c7/:cv7', function(req,res) {
  var item = {};
  if (req.params.c1 == 'building' || req.params.c1 == 'street'|| req.params.c1 == 'zipcode'){
    item["address."+req.params.c1] = req.params.cv1;
  }else{
     item[req.params.c1] = req.params.cv1;
  }
  if (req.params.c2 == 'building' || req.params.c2 == 'street'|| req.params.c2 == 'zipcode'){
    item["address."+req.params.c2] = req.params.cv2;
  }else{
     item[req.params.c2] = req.params.cv2;
  }if (req.params.c3 == 'building' || req.params.c3 == 'street'|| req.params.c3 == 'zipcode'){
    item["address."+req.params.c3] = req.params.cv3;
  }else{
     item[req.params.c3] = req.params.cv3;
  }
  if (req.params.c4 == 'building' || req.params.c4 == 'street'|| req.params.c4 == 'zipcode'){
    item["address."+req.params.c4] = req.params.cv4;
  }else{
     item[req.params.c4] = req.params.cv4;
  }
   if (req.params.c5 == 'building' || req.params.c5 == 'street'|| req.params.c5 == 'zipcode'){
    item["address."+req.params.c5] = req.params.cv5;
  }else{
     item[req.params.c5] = req.params.cv5;
  }
    if (req.params.c6 == 'building' || req.params.c6 == 'street'|| req.params.c6 == 'zipcode'){
    item["address."+req.params.c6] = req.params.cv6;
  }else{
     item[req.params.c6] = req.params.cv6;
  }
  if (req.params.c7 == 'building' || req.params.c7 == 'street'|| req.params.c7 == 'zipcode'){
    item["address."+req.params.c7] = req.params.cv7;
  }else{
     item[req.params.c7] = req.params.cv7;
  }
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

app.get('/api/restaurant/read/:c1/:cv1/:c2/:cv2/:c3/:cv3/:c4/:cv4/:c5/:cv5/:c6/:cv6/:c7/:cv7/:c8/:cv8', function(req,res) {
  var item = {};
  if (req.params.c1 == 'building' || req.params.c1 == 'street'|| req.params.c1 == 'zipcode'){
    item["address."+req.params.c1] = req.params.cv1;
  }else{
     item[req.params.c1] = req.params.cv1;
  }
  if (req.params.c2 == 'building' || req.params.c2 == 'street'|| req.params.c2 == 'zipcode'){
    item["address."+req.params.c2] = req.params.cv2;
  }else{
     item[req.params.c2] = req.params.cv2;
  }if (req.params.c3 == 'building' || req.params.c3 == 'street'|| req.params.c3 == 'zipcode'){
    item["address."+req.params.c3] = req.params.cv3;
  }else{
     item[req.params.c3] = req.params.cv3;
  }
  if (req.params.c4 == 'building' || req.params.c4 == 'street'|| req.params.c4 == 'zipcode'){
    item["address."+req.params.c4] = req.params.cv4;
  }else{
     item[req.params.c4] = req.params.cv4;
  }
   if (req.params.c5 == 'building' || req.params.c5 == 'street'|| req.params.c5 == 'zipcode'){
    item["address."+req.params.c5] = req.params.cv5;
  }else{
     item[req.params.c5] = req.params.cv5;
  }
    if (req.params.c6 == 'building' || req.params.c6 == 'street'|| req.params.c6 == 'zipcode'){
    item["address."+req.params.c6] = req.params.cv6;
  }else{
     item[req.params.c6] = req.params.cv6;
  }
  if (req.params.c7 == 'building' || req.params.c7 == 'street'|| req.params.c7 == 'zipcode'){
    item["address."+req.params.c7] = req.params.cv7;
  }else{
     item[req.params.c7] = req.params.cv7;
  }
  if (req.params.c8 == 'building' || req.params.c8 == 'street'|| req.params.c8 == 'zipcode'){
    item["address."+req.params.c8] = req.params.cv8;
  }else{
     item[req.params.c8] = req.params.cv8;
  }
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

app.get('/api/restaurant/read/:c1/:cv1/:c2/:cv2/:c3/:cv3/:c4/:cv4/:c5/:cv5/:c6/:cv6/:c7/:cv7/:c8/:cv8/:c9/:cv9', function(req,res) {
  var item = {};
  if (req.params.c1 == 'building' || req.params.c1 == 'street'|| req.params.c1 == 'zipcode'){
    item["address."+req.params.c1] = req.params.cv1;
  }else{
     item[req.params.c1] = req.params.cv1;
  }
  if (req.params.c2 == 'building' || req.params.c2 == 'street'|| req.params.c2 == 'zipcode'){
    item["address."+req.params.c2] = req.params.cv2;
  }else{
     item[req.params.c2] = req.params.cv2;
  }if (req.params.c3 == 'building' || req.params.c3 == 'street'|| req.params.c3 == 'zipcode'){
    item["address."+req.params.c3] = req.params.cv3;
  }else{
     item[req.params.c3] = req.params.cv3;
  }
  if (req.params.c4 == 'building' || req.params.c4 == 'street'|| req.params.c4 == 'zipcode'){
    item["address."+req.params.c4] = req.params.cv4;
  }else{
     item[req.params.c4] = req.params.cv4;
  }
   if (req.params.c5 == 'building' || req.params.c5 == 'street'|| req.params.c5 == 'zipcode'){
    item["address."+req.params.c5] = req.params.cv5;
  }else{
     item[req.params.c5] = req.params.cv5;
  }
    if (req.params.c6 == 'building' || req.params.c6 == 'street'|| req.params.c6 == 'zipcode'){
    item["address."+req.params.c6] = req.params.cv6;
  }else{
     item[req.params.c6] = req.params.cv6;
  }
  if (req.params.c7 == 'building' || req.params.c7 == 'street'|| req.params.c7 == 'zipcode'){
    item["address."+req.params.c7] = req.params.cv7;
  }else{
     item[req.params.c7] = req.params.cv7;
  }
  if (req.params.c8 == 'building' || req.params.c8 == 'street'|| req.params.c8 == 'zipcode'){
    item["address."+req.params.c8] = req.params.cv8;
  }else{
     item[req.params.c8] = req.params.cv8;
  }
 if (req.params.c9 == 'building' || req.params.c9 == 'street'|| req.params.c9 == 'zipcode'){
    item["address."+req.params.c9] = req.params.cv9;
  }else{
     item[req.params.c9] = req.params.cv9;
  }
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

app.post('/api/restaurant/create', function(req,res) {
  var new_r = {};
  //if (req.files.filetoupload) var filename = req.files.filetoupload.name;
  new_r['id'] = Date.now().toString();
  if (req.body.name) {new_r['name'] = req.body.name;}
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
  if (req.body.owner) {new_r['owner'] = req.body.owner;}
  var image = {};
  // if (filename) image['image'] = filename;
  // if (filename){
  // fs.readFile(filename, function(err,data) {
  //     new_r['mimetype'] = mimetype;
  //     new_r['image'] = new Buffer(data).toString('base64');
  //     });}
  if (req.body.owner && req.body.name){
    console.log(JSON.stringify(new_r));
  MongoClient.connect(mongourl,function(err,db) {
    new_r['image'] = image;
    insertRestaurants(db,new_r,function(result) {
      db.close();
      //console.log(result);
      
        res.send({
          status: "ok",
          _id: ObjectID(result.insertedId)
        });
      })
  });
  } else{ res.send({
          status: "failed"
        });}
  
        
    
});

app.use(function(req, res) {
  res.status(404).send({url: req.originalUrl + ' not found'})
});

//server.listen(process.env.PORT || 8099);
