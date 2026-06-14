let crcTable;

function makeCrcTable() {
  return Array.from({ length: 256 }, (_, index) => {
    let c = index;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
}

function crc32(bytes) {
  crcTable ||= makeCrcTable();
  let crc = -1;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  return (crc ^ -1) >>> 0;
}

function writeUint32(value) {
  return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
}

function writeUint16(value) {
  return [value & 255, (value >>> 8) & 255];
}

export async function blobToBytes(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

export const FileSaver = {
  saveAs(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

export class JSZip {
  constructor() {
    this.files = [];
  }

  file(name, bytes) {
    this.files.push({ name, bytes });
    return this;
  }

  async generateAsync() {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    for (const file of this.files) {
      const nameBytes = encoder.encode(file.name);
      const bytes = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes);
      const crc = crc32(bytes);
      const local = new Uint8Array([
        0x50, 0x4b, 0x03, 0x04,
        ...writeUint16(20), ...writeUint16(0), ...writeUint16(0),
        ...writeUint16(0), ...writeUint16(0),
        ...writeUint32(crc), ...writeUint32(bytes.length), ...writeUint32(bytes.length),
        ...writeUint16(nameBytes.length), ...writeUint16(0)
      ]);
      localParts.push(local, nameBytes, bytes);
      const central = new Uint8Array([
        0x50, 0x4b, 0x01, 0x02,
        ...writeUint16(20), ...writeUint16(20), ...writeUint16(0), ...writeUint16(0),
        ...writeUint16(0), ...writeUint16(0), ...writeUint32(crc),
        ...writeUint32(bytes.length), ...writeUint32(bytes.length),
        ...writeUint16(nameBytes.length), ...writeUint16(0), ...writeUint16(0),
        ...writeUint16(0), ...writeUint16(0), ...writeUint32(0), ...writeUint32(offset)
      ]);
      centralParts.push(central, nameBytes);
      offset += local.length + nameBytes.length + bytes.length;
    }
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array([
      0x50, 0x4b, 0x05, 0x06,
      ...writeUint16(0), ...writeUint16(0), ...writeUint16(this.files.length), ...writeUint16(this.files.length),
      ...writeUint32(centralSize), ...writeUint32(offset), ...writeUint16(0)
    ]);
    return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
  }
}
