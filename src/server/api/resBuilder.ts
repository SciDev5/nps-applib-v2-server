import { APIDataResponse, APIErrorResponse } from "./api";

/** Make an APIResponse json object with an error `errorKey` */
export function errorRes(errorKey:string):APIErrorResponse {
    return {type:"error",error:errorKey};
}
/** Make an APIResponse json object with json data `data` */
export function dataRes<T>(data:T):APIDataResponse<T> {
    return {type:"data",data};
}