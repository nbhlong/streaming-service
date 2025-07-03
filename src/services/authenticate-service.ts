import { appConfigs } from "../app-configs";
import { Operator } from "../models/operators";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export class AuthenticateService {
  async generateJwtToken(payload: any) {
    return jwt.sign(payload, appConfigs.jwt.secret, { expiresIn: "2h" });
  }

  async getAuthenticatedToken(operatorId: string, password: string) {
    const operator = await Operator.findById(operatorId).lean().exec();

    if (!operator || !operator.password || !(await bcrypt.compare(password, operator.password))) {
      throw new Error("Invalid username or password");
    }

    const payload = { id: operator._id, name: operator.name };
    return this.generateJwtToken(payload);
  }
}
