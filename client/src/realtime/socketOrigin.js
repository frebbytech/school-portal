// The socket lives on the API's own address, without the /api/... path:
// "https://api.example.com/api/frebbys/v1" -> "https://api.example.com"
export const socketOrigin = (baseUrl) => {
  try {
    return baseUrl ? new URL(baseUrl).origin : "";
  } catch {
    return "";
  }
};
