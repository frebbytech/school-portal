const { detectImageType } = require("../../middlewares/upload");

describe("detectImageType", () => {
  it("recognises JPEG, PNG and WebP by their first bytes", () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(
      detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))
    ).toBe("image/png");
    expect(detectImageType(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]))).toBe(
      "image/webp"
    );
  });

  it("rejects other content even if it was named like an image", () => {
    expect(detectImageType(Buffer.from("<?php echo 1; ?>"))).toBeNull();
    expect(detectImageType(Buffer.from("GIF89a......"))).toBeNull();
    expect(detectImageType(Buffer.from("MZ executable"))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});
