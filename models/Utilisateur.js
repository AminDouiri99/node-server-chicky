const mongoose = require("mongoose");

const UtilisateurSchema = new mongoose.Schema(
  {
    pseudo: { type: String },
    email: { type: String },
    mdp: { type: String },
    nom: { type: String },
    prenom: { type: String },
    dateNaissance: { type: Date, },
    idPhoto: { type: String },
    sexe: { type: Boolean },
    score: { type: Number },
    bio: { type: String },
    isVerified: { type: Boolean },
    // Relations
    /*publication: {
      type: mongoose.Types.ObjectId
      ref: Publication
    }*/
  },
  {
    timestamps: { currentTime: () => Date.now() },
  }
);
module.exports = mongoose.model("Utilisateur", UtilisateurSchema);
