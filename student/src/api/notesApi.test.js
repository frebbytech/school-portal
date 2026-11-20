import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { getAllNotes, postNote, putNote, putNoteOrder, deleteNote } from "./noteAPI";
import { getAllNotifications, markNotificationAsRead, deleteNotification } from "./notificationAPI";
import { errorMessage } from "../lib/errorMessage";

const base = "http://api.test/api/frebbys/v1";

// These modules used to RETURN the server's error, so a refused note looked like a saved one.
describe("student notes and notifications report failures by throwing", () => {
  it("rejects a refused note with the server's message", async () => {
    server.use(http.post(`${base}/notes`, () => HttpResponse.json({ message: "Title is required" }, { status: 400 })));
    await expect(postNote({})).rejects.toMatchObject({ message: "Title is required" });
  });

  it("rejects for every other call too, including no connection", async () => {
    server.use(
      http.get(`${base}/notes`, () => HttpResponse.json("nope", { status: 500 })),
      http.put(`${base}/notes/n1`, () => HttpResponse.json({ message: "Note not found" }, { status: 404 })),
      http.put(`${base}/notes/order`, () => HttpResponse.json({ message: "Note not found" }, { status: 404 })),
      http.delete(`${base}/notes/n1`, () => HttpResponse.json({ message: "Note not found" }, { status: 404 })),
      http.get(`${base}/notifications`, () => HttpResponse.error()),
      http.put(`${base}/notifications/x1/read`, () => HttpResponse.json("bad", { status: 500 })),
      http.delete(`${base}/notifications/x1`, () => HttpResponse.json("bad", { status: 404 }))
    );
    await expect(getAllNotes()).rejects.toBe("nope");
    await expect(putNote("n1", {})).rejects.toMatchObject({ message: "Note not found" });
    await expect(putNoteOrder(["n1"])).rejects.toMatchObject({ message: "Note not found" });
    await expect(deleteNote("n1")).rejects.toMatchObject({ message: "Note not found" });
    await expect(getAllNotifications()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    await expect(markNotificationAsRead("x1")).rejects.toBe("bad");
    await expect(deleteNotification("x1")).rejects.toBe("bad");
  });

  it("sends the order as a list of ids", async () => {
    let sent;
    server.use(
      http.put(`${base}/notes/order`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ message: "Order saved" });
      })
    );
    await putNoteOrder(["b", "a"]);
    expect(sent).toEqual({ ids: ["b", "a"] });
  });
});

describe("errorMessage", () => {
  it("reads a string, a { message }, or falls back", () => {
    expect(errorMessage("Plain")).toBe("Plain");
    expect(errorMessage({ message: "Object" })).toBe("Object");
    expect(errorMessage(undefined, "Fallback")).toBe("Fallback");
    expect(errorMessage({ message: " " }, "Fallback")).toBe("Fallback");
  });
});
