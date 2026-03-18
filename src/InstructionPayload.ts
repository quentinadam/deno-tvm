export default abstract class InstructionPayload {
  abstract serialize(): Uint8Array<ArrayBuffer>;
}
