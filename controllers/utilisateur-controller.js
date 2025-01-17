const Utilisateur = require("../models/Utilisateur");

const jwt = require("jsonwebtoken");
const config = require("../config.json");
const Role = require('../middlewares/role');

const bcypt = require("bcrypt");
const nodemailer = require("nodemailer");

// Upload image---------------------------------------
var imgModel = require('../models/Image');
const multer = require("multer");
const fs = require("fs");
var path = require('path');
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads')
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now())
  }
});
var upload = multer({ storage: storage }).any;
//----------------------------------------------------

exports.recupererUtilisateurs = async (req, res) => {
  const utilisateurs = await Utilisateur.find({});

  if (utilisateurs) {
    res.status(200).send({ utilisateurs, message: "success" });
  } else {
    res.status(403).send({ message: "fail" });
  }
};

exports.inscription = async (req, res) => {
  const { pseudo, email, mdp, nom, prenom, dateNaissance, idPhoto, sexe, score, bio } = req.body;

  // upload(req, res, function (err) {
  //   //console.log("picture", req);
  //   const imgPath = req.files[0];
  // });

  const verifUtilisateur = await Utilisateur.findOne({ email });
  if (verifUtilisateur) {
    res.status(403).send({ message: "Utilisateur existe deja !" });
  } else {
    const nouveauUtilisateur = new Utilisateur();

    mdpEncrypted = await bcypt.hash(mdp, 10);

    nouveauUtilisateur.pseudo = pseudo;
    nouveauUtilisateur.email = email;
    nouveauUtilisateur.mdp = mdpEncrypted;
    nouveauUtilisateur.nom = nom;
    nouveauUtilisateur.prenom = prenom;
    //nouveauUtilisateur.dateNaissance = dateNaissance;
    nouveauUtilisateur.idPhoto = idPhoto;
    nouveauUtilisateur.sexe = sexe;
    nouveauUtilisateur.score = score;
    nouveauUtilisateur.bio = bio;
    nouveauUtilisateur.isVerified = false;

    nouveauUtilisateur.save();

    SetupUtilisateurFolder(nouveauUtilisateur._id);
    // token creation
    const token = jwt.sign({ _id: nouveauUtilisateur._id, role: Role.User }, config.token_secret, {
      expiresIn: "60000", // in Milliseconds (3600000 = 1 hour)
    });

    sendConfirmationEmail(email, token);
    res.status(201).send({ message: "success", utilisateur: nouveauUtilisateur, "Token": jwt.verify(token, config.token_secret) });
  }
};

exports.reEnvoyerConfirmationEmail = async (req, res) => {
  const utilisateur = await Utilisateur.findOne({ "email": req.body.email });

  if (utilisateur) {
    // token creation
    const token = jwt.sign({ _id: utilisateur._id, email: utilisateur.email, role: Role.User }, config.token_secret, {
      expiresIn: "60000", // in Milliseconds (3600000 = 1 hour)
    });

    sendConfirmationEmail(req.body.email, token);

    res.status(200).send({ "message": "L\'email de confirmation a été envoyé a " + utilisateur.email })
  } else {
    res.status(404).send({ message: "Utilisateur innexistant" })
  }
};

async function sendConfirmationEmail(email, token) {
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'chicky.app@gmail.com',
      pass: 'chicky-app-cred'
    }
  });

  transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
      console.log("Server not ready");
    } else {
      console.log("Server is ready to take our messages");
    }
  });

  const urlDeConfirmation = "http://localhost:3000/api.chicky.com/utilisateur/confirmation/" + token;

  const mailOptions = {
    from: 'chicky.app@gmail.com',
    to: email,
    subject: 'Confirmation de votre email',
    html: "<h3>Veuillez confirmer votre email en cliquant sur ce lien : </h3><a href='" + urlDeConfirmation + "'>Confirmation</a>"
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

exports.confirmation = async (req, res) => {

  var tokenValue;
  try {
    tokenValue = jwt.verify(req.params.token, config.token_secret);
  } catch (e) {
    return res.status(400).send({ message: 'Le lien verification a peut être expireé, Veuillez revérifier votre email.' });
  }

  Utilisateur.findById(tokenValue._id, function (err, utilisateur) {
    if (!utilisateur) {
      return res.status(401).send({ message: 'Aucun utilisateur, Veuillez proceder a l\'inscription.' });
    }
    else if (utilisateur.isVerified) {
      return res.status(200).send({ message: 'Cet utilisateur a deja été verifié, Veuillez vous connecter' });
    }
    else {
      utilisateur.isVerified = true;
      utilisateur.save(function (err) {
        if (err) {
          return res.status(500).send({ message: err.message });
        }
        else {
          return res.status(200).send({ message: 'Votre compte a été verifié' });
        }
      });
    }
  });
}

exports.connexion = async (req, res) => {
  console.log("body");
  const { email, mdp } = req.body;

  const utilisateur = await Utilisateur.findOne({ email });

  if (utilisateur && (await bcypt.compare(mdp, utilisateur.mdp))) {
    const token = jwt.sign({ id: utilisateur._id, email }, config.token_secret, {
      expiresIn: "360000",
    });
    
    if (!utilisateur.isVerified) {
      res.status(200).send({ utilisateur, message: "email non verifié" });
    }else {
      res.status(200).send({ token, utilisateur, message: "success" });
    }
    
  } else {
    res.status(403).send({ message: "mot de passe ou email incorrect" });
  };
}

exports.modifierProfil = async (req, res) => {
  const { pseudo, email, mdp, nom, prenom, dateNaissance, idPhoto, sexe, score, bio } = req.body;

  let utilisateur = await Utilisateur.findOneAndUpdate(
    { email: email },
    {
      $set: {
        pseudo: pseudo,
        //email: email,
        //mdp : mdp,
        nom: nom,
        prenom: prenom,
        //dateNaissance: dateNaissance,
        idPhoto: idPhoto,
        sexe: sexe,
        score: score,
        bio: bio
      }
    }
  );

  res.send({ utilisateur });
};

exports.modifierPhotoProfil = async (req, res, next) => {
  console.log(req.file);
  upload(req, res, async function (err) {
    if (err) {
      res.send({ err });
    }

    console.log("req", id);
    const path = req.files[0].originalname;
    res.send("")
  });

  /*
 
  var obj = {
    name: req.body.name,
    desc: req.body.desc,
    img: {
      data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
      contentType: 'image/jpeg'
    }
  }
  imgModel.create(obj, (err, item) => {
    if (err) {
      console.log(err);
    }
    else {
      // item.save();
      res.redirect('/');
    }
  });*/
};

exports.supprimerUtilisateur = async (req, res) => {
  console.log(req.body)

  const utilisateur = await Utilisateur.findById(req.body._id).remove()

  res.send({ utilisateur })
}

async function SetupUtilisateurFolder(id) {
  const dir = `./uploads/utilisateurs/utilisateur-${id}`;

  fs.mkdir(dir, function () {
    fs.exists(dir, function (exist, err) {
      if (exist) {
        const dir2 = `./uploads/developers/developer-${id}/profile-pic`;
        fs.mkdir(dir2, function () {
          console.log("folder created");
        });
      }
    });
  });
}

exports.supprimerToutUtilisateur = async (req, res) => {
  Utilisateur.remove({}, function (err, utilisateur) {
    if (err) { return handleError(res, err); }
    return res.status(204).send({ message: "Aucun element" });
  })
}