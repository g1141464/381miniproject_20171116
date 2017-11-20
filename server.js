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
  MongoClient.connect(mongourl, function(err, db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB\n');
    matchLogin(db,match,function(user) {
			db.close();
      console.log('Disconnected MongoDB\n');
      console.log('aaa'+user);
			if (user.length == 0) {
        res.redirect('/logout');
			} else {
          req.session.authenticated = true;
			    req.session.userid = loginUser.userid;
          // MongoClient.connect(mongourl, function(err, db) {
          //   assert.equal(err,null);
          //   console.log('Connected to MongoDB\n');
          //   findRestaurants(db,{},function(restaurants) {
          //     db.close();
          //     console.log('Disconnected MongoDB\n');
          //     console.log('No. of restaurants = '+restaurants.length);
          //     res.render("read", {user: match,
          //                   restaurant: restaurants});
          //     return(restaurants);
          //     });
          // });
          res.redirect('/read');
      }

			
		}); 
})});

app.get('/read', function(req,res) {
  if (!req.session.authenticated) {
		res.status(200);
    res.render("login");
	} else {
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
  if (!req.session.authenticated) {
		res.status(200);
    res.render("login");
	} else {
  if (req.files.filetoupload) var filename = req.files.filetoupload.name;
  var name = (req.body.name.length > 0) ? req.body.name : "untitled";
  if (req.files.filetoupload) var mimetype = req.files.filetoupload.mimetype;
  var new_r = {};
  if (req.body.id) new_r['id'] = req.body.id;
	if (req.body.name) new_r['name'] = req.body.name;
	if (req.body.borough) new_r['borough'] = req.body.borough;
	if (req.body.cuisine) new_r['cuisine'] = req.body.cuisine;
	if (req.body.building || req.body.street || req.body.zipcode || req.body.coord) {
		var address = {};
		if (req.body.building) address['building'] = req.body.building;
    if (req.body.street) address['street'] = req.body.street;
    if (req.body.zipcode) address['zipcode'] = req.body.zipcode;
    if (req.body.coord) address['coord'] = req.body.coord;
		new_r['address'] = address;
  }
  new_r['owner'] = loginUser.userid;

  console.log(new_r);
  console.log("filename = " + filename);
  //
  var exif = {};
  var image = {};
  if (filename) image['image'] = filename;

  try {
    new ExifImage(image, function(error, exifData) {
      if (error) {
        console.log('ExifImage: ' + error.message);
      }
      else {
        exif['image'] = exifData.image;
        exif['exif'] = exifData.exif;
        exif['gps'] = exifData.gps;
        console.log('Exif: ' + JSON.stringify(exif));
      }
    })
  } catch (error) {}
  //
  if (filename){
  fs.readFile(filename, function(err,data) {
    MongoClient.connect(mongourl,function(err,db) {
      new_r['mimetype'] = mimetype;
      new_r['image'] = new Buffer(data).toString('base64');
      new_r['exif'] = exif;
      insertRestaurants(db,new_r,function(result) {
        db.close();
        res.status(200);
        res.end('Restaurant was inserted into MongoDB!');
      })
    });
  })}
  else{MongoClient.connect(mongourl,function(err,db) {
      new_r['image'] = image;
      new_r['exif'] = exif;
      insertRestaurants(db,new_r,function(result) {
        db.close();
        res.status(200);
        res.end('Restaurant was inserted into MongoDB!');})
  })
  }
}});

app.get('/display', function(req,res) {
  if (!req.session.authenticated) {
		res.status(200);
    res.render("login");
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
      if(restaurants[0].exif.gps) console.log('GPS = ' + JSON.stringify(restaurants[0].exif.gps));
      var lat = -1;
      var lon = -1;
      if (restaurants[0].exif.gps &&
          Object.keys(restaurants[0].exif.gps).length !== 0) {
        var lat = gpsDecimal(
          restaurants[0].exif.gps.GPSLatitudeRef,  // direction
          restaurants[0].exif.gps.GPSLatitude[0],  // degrees
          restaurants[0].exif.gps.GPSLatitude[1],  // minutes
          restaurants[0].exif.gps.GPSLatitude[2]  // seconds
        );
        var lon = gpsDecimal(
          restaurants[0].exif.gps.GPSLongitudeRef,
          restaurants[0].exif.gps.GPSLongitude[0],
          restaurants[0].exif.gps.GPSLongitude[1],
          restaurants[0].exif.gps.GPSLongitude[2]
        );
      }
      console.log(lat,lon);      
      res.status(200);
      res.render("photo",{p:restaurants[0],lat:lat,lon:lon});
    });
  });}
});

app.get('/map', function(req,res) {
  res.render('gmap.ejs',
             {lat:req.query.lat,lon:req.query.lon,title:req.query.title});
});

function insertRestaurants(db,r,callback) {
  db.collection('restaurants').insertOne(r,function(err,result) {
    assert.equal(err,null);
    console.log("insert was successful!");
    console.log(JSON.stringify(result));
    callback(result);
  });
}

function deleteRestaurants(db,criteria,callback) {
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

function gpsDecimal(direction,degrees,minutes,seconds) {
  var d = degrees + minutes / 60 + seconds / (60 * 60);
  return (direction === 'S' || direction === 'W') ? d *= -1 : d;
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

//server.listen(process.env.PORT || 8099);
