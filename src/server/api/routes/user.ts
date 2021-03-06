import { Router, Request, Response } from "express";
import UserData from "../../../data/user/UserData";
import { ADMIN_EMAILS, ALLOWED_EMAIL_DOMAINS } from "../../../env";
import { formatPassword, validateEmail, validatePasswordFormat } from "../../../util/auth";
import { verifyEmail } from "../../emailverify/emailVerifier";
import { getUser, login } from "../../session";
// import { login } from "../../session";
import { ERROR, errorCatcher, resError } from "../errors";
import requiresAuth from "../requiresAuth";
import { dataRes, succesRes } from "../resBuilder";

export const userRoute = Router();

/* Return all users.
RESPONSE:
    {id:string, email:string, isEditor:boolean, isAdmin}[] */
userRoute.get("/", requiresAuth("admin"), errorCatcher<never,unknown,unknown,never,{[key:string]:string}>(async (req,res)=>{
    const user = await UserData.getAll();
    const converted = user.map(({id,email,isEditor,isAdmin})=>({id,email,isEditor,isAdmin}));
    res.status(200).json(dataRes(converted));
}));

/* Return a user by id
RESPONSE:
    {id:string, email:string, isEditor:boolean, isAdmin} | undefined */
userRoute.get("/:id", requiresAuth("admin"), errorCatcher<{id:string},unknown,unknown,never,{[key:string]:string}>(async (req,res)=>{
    const user = await UserData.getById(req.params.id);
    const { id, email, isEditor, isAdmin } = user ?? {};
    const data = user ? {id,email,isEditor,isAdmin} : undefined;
    res.status(200).json(dataRes(data));
}));


/* Sign up.
BODY:
    {email:string, password:string}*/
userRoute.post("", requiresAuth("loggedOut"), errorCatcher(async (req,res)=>{
    const {email,password} = req.body as {email:string,password:string};
    if (typeof(email)!=="string" || typeof(password)!=="string") {
        resError(res,ERROR.requestBodyInvalid);
        return;
    }
    const createAccount = async (req:Request,res:Response)=>{
        const user = await UserData.createUser(email,formatPassword(password));
        login(req,user.id);
        const { id, isEditor, isAdmin } = user;
        res.status(200).json(dataRes({id,email,isEditor, isAdmin}));
    };
    if (ADMIN_EMAILS.includes(email))
        createAccount(req,res);
    else {
        if (!validateEmail(email)) {
            resError(res,ERROR.emailInvalid);
            return;
        }
        if (!validatePasswordFormat(password)) {
            resError(res,ERROR.passwordInvalid);
            return;
        }
        if (!ALLOWED_EMAIL_DOMAINS.includes(email.split("@")[1].toLowerCase())) {
            resError(res,ERROR.emailDomainNotAllowed);
            return;
        }
        verifyEmail(email,"sign up",createAccount);
        res.status(200).json(succesRes());
    }
}));


/* Modify another user.
BODY:
    {email?:string, isEditor?:boolean}
RESPONSE:
    {id:string, email:string, isEditor:boolean} */
userRoute.patch("/:id", requiresAuth("admin"), errorCatcher(async (req,res)=>{
    const { id } = req.params;
    const { email, isEditor } = req.body as {email?:string|null,isEditor?:boolean|null};
    if (typeof(email ?? "") !== "string" || typeof(isEditor ?? false) !== "boolean") {
        resError(res,ERROR.requestBodyInvalid);
        return;
    }
    // `??undefined` is added to make it so null|undefined gets crushed down to undefined.
    const user = await UserData.patchUser(id,email??undefined,isEditor??undefined);
    res.status(200).json(dataRes({id,email:user.email,isEditor:user.isEditor}));
}));

/* Modify yourself.
BODY:
    {password?:string}
RESPONSE:
    {id:string, email:string, isEditor:boolean} */
userRoute.patch("",requiresAuth("loggedIn"),(req,res)=>{
    const { password } = req.body;
    if (typeof(password)!=="string") {
        resError(res,ERROR.requestBodyInvalid);
        return;
    }
    const userData = getUser(req)!, { email } = userData; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    verifyEmail(email,"change your password",async(req,res)=>{
        await userData.setPassword(password,true);
        res.status(200).json(succesRes());
    });
    res.status(200).json(succesRes());
    
});