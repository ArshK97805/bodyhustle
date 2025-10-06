// ------------------ Required Modules ------------------
var express = require("express");
var fileuploader = require("express-fileupload");
var cloudinary = require("cloudinary").v2;
const nodemailer = require('nodemailer');
var mysql2 = require("mysql2");
var fs = require("fs");
const fetch = require("node-fetch");
globalThis.fetch = fetch;



// ------------------ Google Gemini AI Setup ------------------
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyCze8dXVHoRVqYTDcli8DfyxBP3e-dJUDc"); // Replace with valid key
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });







/// ------------------ Middleware Setup ------------------
var app = express();//app() returns an Object:app
app.use(express.urlencoded({ extended: true }));
app.use(fileuploader());//for receiving files from client and save on server files







// Server Start - Listening on Port 2028
app.listen(2028, function () {
  console.log("Server Started at Port no: 2028")
})





// ------------------ Static Folder ------------------
app.use(express.static("public"));




// ------------------ Root Route ------------------
app.get("/", function (req, resp) {
  console.log(__dirname);
  console.log(__filename);

  let path = __dirname + "/public/index.html";
  resp.sendFile(path);
})



// ------------ Signup (GET Method Example) ------------------
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








// ------------------ Cloudinary Config ------------------
app.use(express.urlencoded(true)); //convert POST data to JSON object

cloudinary.config({
  cloud_name: 'dzjxdf5oj',
  api_key: '628224982589672',
  api_secret: 'Nd7q3pRJKKfcnU4QnsbzhmMVuUs' // Click 'View API Keys' above to copy your API secret
});



//--------------------------------AIven started---------------------------
// MySQL Aiven Cloud Database Connection Setup
// ---------------- MySQL Database Connection ------------------
let dbConfig = "mysql://avnadmin:AVNS_K1dPH4CXduBNRPAmhNa@mysql-2a903107-kumararsh228-9f48.c.aivencloud.com:27270/sports_project";







// Route: User Login (Check user credentials and status)
let mySqlVen = mysql2.createConnection(dbConfig);
mySqlVen.connect(function (errKuch) {
  if (errKuch == null)
    console.log("AiVen Connected Successfulllyyy!!!!");
  else
    console.log(errKuch.message)
})









// ------------- Route: Signup (Insert User) ------------------
app.get("/signup-user", async function (req, resp) {

  let emailid = req.query.txtEmail;
  let pwd = req.query.txtPwd;
  let utype = req.query.utype;


  mySqlVen.query("insert into users values(?,?,?,current_date(),1)", [emailid, pwd, utype], function (errKuch) {
    if (errKuch == null) {
      resp.send("Signup successful");
    }

    else {
      resp.send("Error: " + errKuch.message);
    }
  });
});










// ------------------ Route: Login ------------------
app.get("/do-login", function (req, resp) {
  let email = req.query.emailid;
  let password = req.query.password;

  let query = "SELECT * FROM users WHERE emailid = ? AND password = ?";

  mySqlVen.query(query, [email, password], function (err, allRecords) {
    if (allRecords.length == 0) {
      resp.send("Invalid");
    }
    else if (allRecords[0].status == 1) {
      resp.send(allRecords[0].utype);
    }
    else {
      resp.send("Blocked");
    }
  });








  // ------------------ Route: Email Check ------------------
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










// ------ Route: Submit Organizer Details + Upload Pic ----------
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
    website, insta, head_name, contact, picurl, otherinfo], function (err) {
      if (err) {
        console.log("MySQL Error:", err);
        resp.send("Database Error: " + err.message);
      } else {
        resp.send("Organizer details saved successfully ✅");
      }
    });
});






// -------------- Route: Update Organizer Details ----------
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
  mySqlVen.query(query, [org_name, reg_no, addr, city, sports, website, insta, head_name, contact, picurl, otherinfo, email], function (err, result) {
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







//------------------ Route: Fetch One Organizer by Email ------
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







// ------------------ Route: Publish Event ------------------
app.post("/publish-event", function (req, resp) {
  let { emailid, event, doe, toe, address, city, sports, minage, maxage, lastdate, fee, prize, contact } = req.body;

  let insertQuery = `INSERT INTO events(emailid, event, doe, toe, address, city, sports, minage, maxage, lastdate, fee, prize, contact)VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  mySqlVen.query(insertQuery, [emailid, event, doe || null, toe || null, address, city, sports, minage, maxage, lastdate || null, fee, prize, contact], function (err) {
    if (err) {
      console.log("MySQL Error:", err);
      resp.send("Database Error: " + err.message);
    } else {
      resp.send("✅ Event submitted successfully!");
    }
  });
});






// ---------- Route: Get All Events by Organizer ----------------
app.get("/fetch-events-by-email", function (req, res) {
  const email = req.query.email;
  mySqlVen.query("SELECT * FROM events WHERE emailid = ?", [email], function (err, result) {
    if (err) res.status(500).send(err);
    else res.send(result); // Even if empty
  });
});






// ------------------ Route: Delete Event ------------------
app.get("/delete-event", function (req, res) {
  const rid = req.query.rid;
  mySqlVen.query("DELETE FROM events WHERE rid = ?", [rid], function (err, result) {
    if (err) res.status(500).send("Error deleting");
    else res.send("Tournament deleted");
  });
});








//---fetch tournament by rid---
app.get("/get-tournament-by-rid", function (req, res) {
  const rid = req.query.rid;
  con.query("SELECT * FROM events WHERE rid=?", [rid], function (err, result) {
    if (err) res.status(500).send(err);
    else res.send(result);
  });
});










// ---------- Route: Submit Player Details with Pics------------
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









/// ------------------ Route: Get Player by Email ----------
app.get("/get-player", function (req, resp) {
  const email = req.query.email;
  const query = "SELECT * FROM players WHERE email = ?";

  mySqlVen.query(query, [email], function (err, result) {
    if (err) resp.status(500).send({ message: "Server error" });
    else if (result.length === 0) resp.send({ message: "No data found" });
    else resp.send(result);
  });
});










// ------------------ Route: Fetch All Users ---------------

app.get("/fetch-all-users", function (req, res) {
  let query = "SELECT * FROM users";
  mySqlVen.query(query, function (err, result) {
    if (err) res.status(500).send("DB Error: " + err.message);
    else res.send(result);
  });
});











// ------------------ Route: Update User Status ---------------
app.get("/update-user-status", function (req, res) {
  const { email, status } = req.query;
  const query = "UPDATE users SET status=? WHERE emailid=?";
  mySqlVen.query(query, [status, email], function (err, result) {
    if (err) res.status(500).send("Error: " + err.message);
    else res.send(`User ${status == 1 ? "Resumed" : "Blocked"} Successfully`);
  });
});







// ------------------ Route: Help Page -----------------
app.get("/ai", function (req, resp) {
  let fullpath = __dirname + "/public/help-us.html";
  resp.sendFile(fullpath);
});

// ------------------ Route: Ask Gemini AI ------------------
app.post("/abc", async function (req, resp) {
  console.log(req.body);
  let txt = req.body.txtttt;
  let prompt = txt + " Give response in JSON object with key message";

  const result = await model.generateContent(prompt);
  resp.send(result.response.text());
});

async function RajeshBansalKaChirag(imgurl, docType) {
  let myprompt;

  switch (docType) {
    case "aadhaar":
      myprompt = `
Read the text from the image of Aadhaar card. Extract and return the data STRICTLY in JSON format as:
{
  "adhaar_number": "",
  "name": "",
  "gender": "",
  "dob": ""
}
No extra text, no explanation.
      `;
      break;

    case "driving_license":
      myprompt = `
Read the text from the Driving License image and extract details in STRICT JSON format:
{
  "license_number": "",
  "name": "",
  "dob": "",
  "validity": "",
  "address": ""
}
No extra text, no explanation.
      `;
      break;

    case "college_id":
      myprompt = `
Read the text from a College Identity Card image. Extract and return the following in STRICT JSON format:
{
  "student_name": "",
  "college_name": "",
  "roll_number": "",
  "course": "",
  "valid_upto": ""
}
No extra info. No explanation.
      `;
      break;

    default:
      myprompt = "Extract information from the ID card in JSON format.";
      break;
  }

  const imageResp = await fetch(imgurl).then((res) => res.arrayBuffer());

  const result = await model.generateContent([
    {
      inlineData: {
        data: Buffer.from(imageResp).toString("base64"),
        mimeType: "image/jpeg", // Can be dynamic if needed
      },
    },
    { text: myprompt },
  ]);

  let rawText = result.response.text();
  // Remove markdown code block formatting if present
  rawText = rawText.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();

  let jsonData;
  try {
    jsonData = JSON.parse(rawText);
  } catch (e) {
    console.error("JSON parse error:", rawText);
    return { error: "Invalid AI output", raw: rawText };
  }

  return jsonData;
}

// ------------------ Route: Aadhaar OCR ----------
app.post("/picreader", async function (req, resp) {
  const docType = req.body.doctype || "aadhaar"; // default
  let fileName;

  if (req.files != null) {
    try {
      fileName = req.files.imggg.name;
      const locationToSave = __dirname + "/public/uploads/" + fileName;
      await req.files.imggg.mv(locationToSave);

      await cloudinary.uploader.upload(locationToSave).then(async function (picUrlResult) {
        try {
          const jsonData = await RajeshBansalKaChirag(picUrlResult.url, docType);
          resp.json(jsonData); // Always send JSON
        } catch (err) {
          resp.json({ error: err.message });
        }
      });

    } catch (err) {
      resp.json({ error: err.message });
    }
  } else {
    resp.json({ error: "No file uploaded." });
  }
});



// ------------------ Route: Get All Organizers ------
app.get("/fetchAllOrganizer", function (req, res) {
  let query = "SELECT * FROM organizer_details";
  mySqlVen.query(query, function (err, result) {
    if (err) res.status(500).send("DB Error: " + err.message);
    else res.send(result);
  });
});







// ------------------ Route: Get All Players -------------
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


// Fetch events list
app.get("/events", function (req, res) {
  const query = `SELECT rid, event, sports FROM events ORDER BY doe DESC`;
  mySqlVen.query(query, function (err, result) {
    if (err) {
      res.status(500).send("DB error: " + err.message);
    } else {
      res.json(result);
    }
  });
});

// Leaderboard route
// Get all events for dropdown
app.get("/events", function (req, res) {
  const sql = `
    SELECT rid, event, sports 
    FROM events
    ORDER BY doe DESC
  `;
  mySqlVen.query(sql, function (err, result) {
    if (err) {
      res.status(500).send("DB error: " + err.message);
    } else {
      res.json(result);
    }
  });
});

// Get leaderboard for a specific event
app.get("/leaderboard", function (req, res) {
  const eventId = req.query.eventId;

  if (!eventId) {
    return res.status(400).send("Missing eventId");
  }

  const query = `
    SELECT 
        p.email,
        p.name,
        p.games,
        p.profilepic,
        COALESCE(SUM(CASE WHEN m.result = 'win' THEN 1 ELSE 0 END), 0) AS wins,
        COALESCE(SUM(CASE WHEN m.result = 'loss' THEN 1 ELSE 0 END), 0) AS losses,
        COALESCE(SUM(CASE WHEN m.result = 'draw' THEN 1 ELSE 0 END), 0) AS draws,
        COUNT(m.id) AS total_games
    FROM players p
    LEFT JOIN match_results m 
        ON p.email = m.player_email
    INNER JOIN events e
        ON e.rid = m.tournament_id
    WHERE e.rid = ?
    GROUP BY p.email, p.name, p.games, p.profilepic
    ORDER BY wins DESC, losses ASC
  `;

  mySqlVen.query(query, [eventId], function (err, result) {
    if (err) {
      res.status(500).send("DB error: " + err.message);
    } else {
      res.json(result);
    }
  });
});








// --------------- Route: Get All Cities from Events -------
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





// ------------------ Route: Change Password ---------------
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


// ===================== PLAYER ROUTES =====================

// ===================== LEADERBOARD ADMIN APIs =====================

// 1️⃣ Fetch Events for Dropdown
app.get("/events", (req, res) => {
  const query = "SELECT rid, event, sports FROM events";
  mySqlVen.query(query, (err, result) => {
    if (err) res.status(500).send({ error: err.message });
    else res.json(result);
  });
});

// 2️⃣ Fetch Leaderboard for Selected Event
app.get("/leaderboard", (req, res) => {
  const { eventId } = req.query;
  const query = "SELECT * FROM leaderboard WHERE eventId = ?";
  mySqlVen.query(query, [eventId], (err, result) => {
    if (err) res.status(500).send({ error: err.message });
    else res.json(result);
  });
});

// 3️⃣ Add or Update Player
app.post("/admin/add-leaderboard", (req, res) => {
  const { eventId, email, game, wins, losses, draws } = req.body;
  const total = Number(wins) + Number(losses) + Number(draws);

  const query = `
    INSERT INTO leaderboard (eventId, email, game, wins, losses, draws, total_games)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      game = VALUES(game),
      wins = VALUES(wins),
      losses = VALUES(losses),
      draws = VALUES(draws),
      total_games = VALUES(total_games)
  `;

  mySqlVen.query(query, [eventId, email, game, wins, losses, draws, total], (err, result) => {
    if (err) res.status(500).send({ message: "Server Error: " + err.message });
    else res.json({ message: "Player data added/updated successfully!" });
  });
});

// 4️⃣ Delete Player
app.post("/admin/delete-leaderboard", (req, res) => {
  const { eventId, email } = req.body;
  const query = "DELETE FROM leaderboard WHERE eventId=? AND email=?";
  mySqlVen.query(query, [eventId, email], (err, result) => {
    if (err) res.status(500).send({ message: "Server Error: " + err.message });
    else res.json({ message: "Player deleted successfully!" });
  });
});
