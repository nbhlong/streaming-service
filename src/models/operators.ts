import mongoose from "mongoose";

const operatorSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  password: String,
});

export const Operator = mongoose.model("operators", operatorSchema);
