/** The HTTP statuses the API answers with and the typed client tells apart. */
export enum HttpStatus {
  Ok = 200,
  NoContent = 204,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  Conflict = 409,
  UnprocessableEntity = 422,
  InternalServerError = 500,
  ServiceUnavailable = 503,
}
