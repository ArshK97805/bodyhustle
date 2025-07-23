var express = require("express");
var fileuploader = require("express-fileupload");
var cloudinary = require("cloudinary").v2;
const nodemailer = require('nodemailer');
var mysql2 = require("mysql2");
var fs = require("fs");
const fetch = require("node-fetch");
globalThis.fetch = fetch;


const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyCze8dXVHoRVqYTDcli8DfyxBP3e-dJUDc"); // Replace with valid key
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

var app = express();//app() returns an Object:app
app.use(express.urlencoded({ extended: true }));
app.use(fileuploader());//for receiving files from client and save on server files


app.listen(2028, function () {
  console.log("Server Started at Port no: 2028")
})

app.use(express.static("public"));

app.get("/", function (req, resp) {
  console.log(__dirname);
  console.log(__filename);

  let path = __dirname + "/public/index.html";
  resp.sendFile(path);
})


app.get("/server-index", function (req, resp) {
  //resp.send(req.query);
  //console.log(req.query.txtEmail,req.query.txtPwd);

  let email = req.query.txtEmail;
  let pwd = req.query.txtPwd;


  //req.query.usertype: is an array
  let usertype = "";
  if (Array.isArray(req.query.utype)) {
    for (i = 0; i < req.query.utype.length; i++) {
      usertype = usertype + req.query.utype[i] + ",";
    }
  }
  else
    usertype = req.query.utype;

  resp.send(email + "<br>" + pwd + "<br>" + usertype);


})

app.use(express.urlencoded(true)); //convert POST data to JSON object
cloudinary.config({
  cloud_name: 'dzjxdf5oj',
  api_key: '628224982589672',
  api_secret: 'Nd7q3pRJKKfcnU4QnsbzhmMVuUs' // Click 'View API Keys' above to copy your API secret
});
//--------------------------------AIven started---------------------------
let dbConfig = "mysql://avnadmin:AVNS_K1dPH4CXduBNRPAmhNa@mysql-2a903107-kumararsh228-9f48.c.aivencloud.com:27270/sports_project";

let mySqlVen = mysql2.createConnection(dbConfig);
mySqlVen.connect(function (errKuch) {
  if (errKuch == null)
    console.log("AiVen Connected Successfulllyyy!!!!");
  else
    console.log(errKuch.message)
})

app.get("/signup-user", async function (req, resp) {

  let emailid = req.query.txtEmail;
  let pwd = req.query.txtPwd;
  let utype = req.query.utype;


  mySqlVen.query("insert into users values(?,?,?,current_date(),1)", [emailid, pwd, utype], function (errKuch) {
    if (errKuch == null) {
      resp.send("Signup successful");
    }

   else{
  resp.send("Error: " + errKuch.message);
  }
});
});

app.get("/do-login", function (req, resp) {
  let email = req.query.emailid;
  let password = req.query.password;

  let query = "SELECT * FROM users WHERE emailid = ? AND password = ?";
  
  mySqlVen.query(query, [email, password], function (err, allRecords) {
    if (allRecords.length == 0) 
    {
      resp.send("Invalid");
    }
    else if (allRecords[0].status == 1) 
    {
        resp.send(allRecords[0].utype);
    } 
    else 
    {
        resp.send("Blocked");
    }
  });
  app.get("/chk-email", function (req, resp) {
    mySqlVen.query("SELECT * FROM users WHERE emailid=?", [req.query.txtEmail], function (err, allRecords) {
      if (err) {
        console.log("Email Check Error:", err);
        resp.status(500).send("Server error");
      } else {
        if (allRecords.length === 0)
          resp.send("Not Exists");
        else
        resp.send("Exists");
    }
  });
  }); 
});

app.post("/submit-organizer", async function (req, resp) {
  let picurl = "nopic.jpg";

  if (req.files != null) {
    let fName = req.files.profilePic.name;
    let fullPath = __dirname + "/public/uploads/" + fName;
    
    // Save to server temp folder
    await req.files.profilePic.mv(fullPath);
    
    // Upload to Cloudinary
    await cloudinary.uploader.upload(fullPath).then(function (picResult) {
      picurl = picResult.secure_url;
      console.log("Uploaded to Cloudinary:", picurl);
    }).catch(function (err) {
      console.log("Cloudinary upload error:", err);
    });
  }
  
  // Collect form data
  let email = req.body.email;
  let org_name = req.body.org_name;
  let reg_no = req.body.reg_no;
  let addr = req.body.addr;
  let city = req.body.city;
  let sports = req.body.sports;
  let website = req.body.website;
  let insta = req.body.insta;
  let head_name = req.body.head_name;
  let contact = req.body.contact;
  let otherinfo = req.body.otherinfo;
  
  // MySQL Insert Query
  let insertQuery = `
  INSERT INTO organizer_details 
  (email, org_name, reg_no, addr, city, sports, website, insta, head_name, contact, reg_pic,otherinfo)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
  `;
  
  // Execute the query
  mySqlVen.query(insertQuery, [
    email, org_name, reg_no, addr, city, sports,
    website, insta, head_name, contact, picurl,otherinfo], function (err) {
    if (err) {
      console.log("MySQL Error:", err);
      resp.send("Database Error: " + err.message);
    } else {
      resp.send("Organizer details saved successfully ✅");
    }
  });
});

app.post("/update-user", async function (req, resp) {
  let picurl = "";
  
  // If a new file is uploaded
  if (req.files != null) {
    let fName = req.files.profilePic.name;
    let fullPath = __dirname + "/public/uploads/" + fName;
    await req.files.profilePic.mv(fullPath);
    
    await cloudinary.uploader.upload(fullPath).then(function (result) {
      picurl = result.secure_url;
    }).catch(function (err) {
      console.log("Cloudinary Error:", err);
      resp.send("Error uploading image.");
      return;
    });
  } else {
    // Use existing pic from hidden input
    picurl = req.body.hdn;
  }
  
  // Fetch form data
  let email = req.body.email;
  let org_name = req.body.org_name;
  let reg_no = req.body.reg_no;
  let addr = req.body.addr;
  let city = req.body.city;
  let sports = req.body.sports;
  let website = req.body.website;
  let insta = req.body.insta;
  let head_name = req.body.head_name;
  let contact = req.body.contact;
  let otherinfo = req.body.otherinfo;

  
  // MySQL update query
  let query = `UPDATE organizer_details SET org_name=?, reg_no=?, addr=?, city=?, sports=?, website=?, insta=?, head_name=?, contact=?, reg_pic=?,otherinfo=?
  WHERE email=?
  `;
  
  // Execute query
  mySqlVen.query(query,[org_name, reg_no, addr, city, sports, website,insta,head_name, contact, picurl,otherinfo, email], function (err, result) {
    if (err) {
      console.log("MySQL Error:", err);
      resp.send("Update failed: " + err.message);
    } else {
      if (result.affectedRows == 1)
        resp.send("Record updated successfully ✅");
      else
      resp.send("Invalid Email ID ❌");
  }
});
});
app.get("/get-one", function (req, resp) {
  let email = req.query.txtEmail;

  let query = "SELECT * FROM organizer_details WHERE email = ?";
  mySqlVen.query(query, [email], function (err, result) {
    if (err) {
      console.log("MySQL Error in /get-one:", err);
      resp.status(500).send({ message: "DB error" });
    } else {
      if (result.length === 0) {
        resp.send({ message: "No records found" });  // ✅ send message
      } else {
        resp.send(result); // ✅ found records
      }
    }
  });
});
app.post("/publish-event", function (req, resp) {
  let {emailid,event,doe,toe,address,city,sports,minage,maxage,lastdate,fee,prize,contact}=req.body;

  let insertQuery = `INSERT INTO events(emailid, event, doe, toe, address, city, sports, minage, maxage, lastdate, fee, prize, contact)VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  mySqlVen.query(insertQuery, [emailid,event,doe || null,toe || null,address,city,sports,minage, maxage,lastdate || null,fee,prize,contact], function (err) {
    if (err) {
      console.log("MySQL Error:", err);
      resp.send("Database Error: " + err.message);
    } else {
      resp.send("✅ Event submitted successfully!");
    }
  });
});

//do fetch all users
// Fetch all events
app.get("/fetch-events-by-email", function (req, res) {
  const email = req.query.email;
  mySqlVen.query("SELECT * FROM events WHERE emailid = ?", [email], function (err, result) {
    if (err) res.status(500).send(err);
    else res.send(result); // Even if empty
  });
});

app.get("/delete-event", function (req, res) {
  const rid = req.query.rid;
  mySqlVen.query("DELETE FROM events WHERE rid = ?", [rid], function (err, result) {
    if (err) res.status(500).send("Error deleting");
    else res.send("Tournament deleted");
  });
});
app.get("/get-tournament-by-rid", function (req, res) {
  const rid = req.query.rid;
  con.query("SELECT * FROM events WHERE rid=?", [rid], function (err, result) {
    if (err) res.status(500).send(err);
    else res.send(result);
  });
});
// POST - Upload Player Data
// POST - Upload Player Data
app.post("/upload-player", async function (req, resp) {
  let profilePicUrl = "nopic.jpg";
  let aadhaarPicUrl = "nopic.jpg";

  if (req.files != null) {
    if (req.files.profilePic) {
      let profilePath = __dirname + "/public/uploads/" + req.files.profilePic.name;
      await req.files.profilePic.mv(profilePath);
      let result = await cloudinary.uploader.upload(profilePath);
      profilePicUrl = result.secure_url;
    }
    if (req.files.aadhaarPic) {
      let aadhaarPath = __dirname + "/public/uploads/" + req.files.aadhaarPic.name;
      await req.files.aadhaarPic.mv(aadhaarPath);
      let result = await cloudinary.uploader.upload(aadhaarPath);
      aadhaarPicUrl = result.secure_url;
    }
  }

  const { email, name, dob, gender, contact, address, games, otherinfo } = req.body;
  const query = `INSERT INTO players
  (email, name, dob, gender, contact, address, games, otherinfo, profilepic, aadhaarpic) VALUES (?,?,?,?,?,?,?,?,?,?)`;

  mySqlVen.query(query, [email, name, dob, gender, contact, address, games, otherinfo, profilePicUrl, aadhaarPicUrl], function (err) {
    if (err) resp.send("Database Error: " + err.message);
    else resp.send("✅ Player data uploaded successfully");
  });
});

// POST - Modify Player Data
app.post("/update-player", async function (req, resp) {
  let profilePicUrl = req.body.profilePicOld || "nopic.jpg";
  let aadhaarPicUrl = req.body.aadhaarPicOld || "nopic.jpg";

  if (req.files != null) {
    if (req.files.profilePic) {
      let profilePath = __dirname + "/public/uploads/" + req.files.profilePic.name;
      await req.files.profilePic.mv(profilePath);
      let result = await cloudinary.uploader.upload(profilePath);
      profilePicUrl = result.secure_url;
    }
    if (req.files.aadhaarPic) {
      let aadhaarPath = __dirname + "/public/uploads/" + req.files.aadhaarPic.name;
      await req.files.aadhaarPic.mv(aadhaarPath);
      let result = await cloudinary.uploader.upload(aadhaarPath);
      aadhaarPicUrl = result.secure_url;
    }
  }

  const { email, name, dob, gender, contact, address, games, otherinfo } = req.body;
  const query = `UPDATE players SET name=?, dob=?, gender=?, contact=?, address=?, games=?, otherinfo=?, profilepic=?, aadhaarpic=? WHERE email=?`;

  mySqlVen.query(query, [name, dob, gender, contact, address, games, otherinfo, profilePicUrl, aadhaarPicUrl, email], function (err, result) {
    if (err) resp.send("Update Error: " + err.message);
    else if (result.affectedRows == 0) resp.send("❌ Email not found");
    else resp.send("✅ Player data updated successfully");
  });
});

// GET - Get Player Data
app.get("/get-player", function (req, resp) {
  const email = req.query.email;
  const query = "SELECT * FROM players WHERE email = ?";

  mySqlVen.query(query, [email], function (err, result) {
    if (err) resp.status(500).send({ message: "Server error" });
    else if (result.length === 0) resp.send({ message: "No data found" });
    else resp.send(result);
  });
});

app.get("/fetch-all-users", function (req, res) {
  let query = "SELECT * FROM users";
  mySqlVen.query(query, function (err, result) {
    if (err) res.status(500).send("DB Error: " + err.message);
    else res.send(result);
  });
});
app.get("/update-user-status", function (req, res) {
  const { email, status } = req.query;
  const query = "UPDATE users SET status=? WHERE emailid=?";
  mySqlVen.query(query, [status, email], function (err, result) {
    if (err) res.status(500).send("Error: " + err.message);
    else res.send(`User ${status == 1 ? "Resumed" : "Blocked"} Successfully`);
  });
});

app.get("/ai", function (req, resp) {
  let fullpath = __dirname + "/public/help-us.html";
  resp.sendFile(fullpath);
});

app.post("/abc", async function (req, resp) {
  console.log(req.body);
  let txt = req.body.txtttt;
  let prompt = txt + " Give response in JSON object with key message";

  const result = await model.generateContent(prompt);
  resp.send(result.response.text());
});

async function RajeshBansalKaChirag(imgurl) {
  const myprompt = "Read the text on picture and tell all the information in adhaar card and give output STRICTLY in JSON format {adhaar_number:'', name:'', gender:'', dob: ''}. Dont give output as string.";

  const imageResp = await fetch(imgurl).then((response) => response.arrayBuffer());

  const result = await model.generateContent([
    {
      inlineData: {
        data: Buffer.from(imageResp).toString("base64"),
        mimeType: "image/jpeg",
      },
    },
    myprompt,
  ]);

  console.log(result.response.text());
  const cleaned = result.response.text().replace(/```json|```/g, '').trim();
  const jsonData = JSON.parse(cleaned);
  return jsonData;
}

app.post("/picreader", async function (req, resp) {
  let fileName;
  if (req.files != null) {
    try {
      fileName = req.files.imggg.name;
      let locationToSave = __dirname + "/public/uploads/" + fileName;
      await req.files.imggg.mv(locationToSave);

      await cloudinary.uploader.upload(locationToSave).then(async function (picUrlResult) {
        let jsonData = await RajeshBansalKaChirag(picUrlResult.url);
        resp.send(jsonData);
      });

    } catch (err) {
      resp.send(err.message);
    }
  }
});


app.get("/fetchAllOrganizer", function (req, res) {
  let query = "SELECT * FROM organizer_details";
  mySqlVen.query(query, function (err, result) {
    if (err) res.status(500).send("DB Error: " + err.message);
    else res.send(result);
  });
});

app.get("/fetchAllPlayers", function (req, resp) {
  let query = "SELECT * FROM players";
  mySqlVen.query(query, function (err, result) {
    if (err) {
      console.log("MySQL Error in fetchAllPlayers:", err);
      resp.status(500).send({ message: "DB error" });
    } else {
      resp.send(result);
    }
  });
});

// Route to fetch filtered tournaments
app.get("/do-fetch-all-tournaments", function (req, resp) {

  console.log(req.query); // Example: { kuchCity: 'Ludhiana', kuchGame: 'Football' }

  let query = "SELECT * FROM events WHERE city=? AND sports=?";
  mySqlVen.query(query, [req.query.kuchCity, req.query.kuchGame], function (err, allRecords) {
    if (err) {
      console.log("DB Error:", err);
      resp.status(500).send("DB Error: " + err.message);
    } else {
      console.log(allRecords);
      resp.send(allRecords);
    }
  });
});

// Route to fetch all unique cities for dropdown
app.get("/do-fetch-all-cities", function (req, resp) {
  let query = "SELECT DISTINCT city FROM events";
  mySqlVen.query(query, function (err, allRecords) {
    if (err) {
      console.log("DB Error:", err);
      resp.status(500).send("DB Error: " + err.message);
    } else {
      resp.send(allRecords);
    }
  });
});

// CHANGE PASS IN SETTINGS
app.get("/do-change-password", function (req, resp) {
    let emailid = req.query.emailid;
    let oldpass = req.query.oldpass;
    let newpass = req.query.newpass;

    let updateQuery = "UPDATE users SET password=? WHERE emailid=? AND password=? AND utype='Players'";

    mySqlVen.query(updateQuery, [newpass, emailid, oldpass], function (errKuch, result) {
        if (result.affectedRows == 0) {
            resp.send("Wrong Email ID or Password");
        } else {
            resp.send("Password Updated Successfully!!");
        }
    });
});
 