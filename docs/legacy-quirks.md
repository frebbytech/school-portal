# Legacy API behaviours that clients may rely on

The refactoring keeps these exactly as they are until the owning stage changes them on purpose (one quirk per release, with the client updated first). This is the checked-in "legacy quirks" table promised in Stage 5; there is deliberately **no runtime response adapter**: the central error handler already emits the legacy error body (`{ status, statusCode, message }`, plus `code` and `requestId`), and success bodies are left untouched by every stage.

| Area | Behaviour kept | Where |
|---|---|---|
| Success bodies | many endpoints answer a bare JSON string (`"Changes Saved!"`, `"New Teacher Added!!!"`, `"Message delivered successfully!!!"`), including the misspelling `"Chnages Saved!"` (events, announcements) | most routers |
| Status codes | `PUT`/`POST` updates often answer **201** (teachers, levels, grades, parents, subjects, terms); deletes answer 200, 201 or 204 depending on the router; `DELETE /grades/:id`, `/subjects/:id` answer 204 **with** a body | all routers |
| Not found on read | `GET /…/:id` answers **200 with `null`** (or `{}` for parents) for a missing or other-school record instead of 404 | levels, grades, departments, houses, schools, events, announcements, notifications |
| Login failure | wrong username/password, disabled account and platform accounts at the school login all answer **404** with `" Username or Password is incorrect !"` | `POST /users/login`, `/platform/login` |
| Expired token | an expired or invalid access token answers **403** `"Session has expired.Please login again"`; a missing token answers 401 | `verifyJWT` |
| Student login | wrong credentials answer 401; deactivated students 403 | `student-auth` |
| Permission errors | role/scope failures answer 403 with the bare string `"You do not have permission to perform this action."` | all guards |
| Validation errors | 400 with the standard error body (`code: VALIDATION_ERROR`); schema errors from Mongoose are mapped the same way | error handler |
| Lists | list endpoints return a bare array; pagination is **opt-in** (`?page=&limit=`) and keeps the array shape, with the total in the `X-Total-Count` header | notifications, messages, events, announcements, students |
| Bulk delete bodies | `DELETE /departments/remove` takes `{ departments }`, `/houses/remove` `{ houses }`, `PUT /events/remove` `{ events }`, `PUT /announcements/remove` `{ announcements }`, `DELETE /notifications/remove` `{ notifications }`, `PUT /terms/remove` a bare array of ids | respective routers |
| Names | student first names are stored lower-cased by the model | `studentModel` |
| Create-on-read | attendance and examination records may be created when first read (to be changed only behind a flag, Stage 9) | attendance, examinations |
| Terms | `GET /terms/sessions` for teachers filters on the misspelt status `"curent"` and therefore returns nothing for them | `termRoute` |
| Holidays | `GET /holidays?year=` ignores `year` and returns every holiday of the school; the clients call a `DELETE /holidays/remove` that does not exist | `holidayRoute` |
