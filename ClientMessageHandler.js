import CommandTypes from "./Synchronizer/CommandTypes.js";

export default class ClientMessageHandler {
    #clientId;
    #address;
    #socket;
    #sceneSynchronizer;
    #clientsSynchronizer;

    #textEncoder = new TextEncoder();

    constructor ( address ) {
		console.log("ClientMessageHandler - constructor");
        this.#address = address;

    }

    connect ( ) {
		console.log("ClientMessageHandler - connect");

		this.#socket = new WebSocket(this.#address);
		this.#socket.binaryType = 'arraybuffer';
    }

    setSynchronizer ( sceneSynchronizer ) {
		console.log("ClientMessageHandler - setSynchronizer");

        this.#sceneSynchronizer = sceneSynchronizer;
    }

    set clientId ( clientId ) {
		console.log("ClientMessageHandler - set clientId");
        this.#clientId = clientId;
    }

    sendObjectSelect ( objectId ) {
		console.log("ClientMessageHandler - sendObjectSelect");

        const buffer = this.#encodeMessage(
            CommandTypes.SELECT,
            {objectId: objectId}
        );

        this.#socket.send(buffer);
    }

    sendObjectDeselect ( objectId ) {
		console.log("ClientMessageHandler - sendObjectDeselect");

        const buffer = this.#encodeMessage(
            CommandTypes.DESELECT,
            {objectId: objectId}
        );

        this.#socket.send(buffer);
    }

    sendObjectMatrix ( objectId, matrix ) {
        // console.log("ClientMessageHandler - sendObjectMatrix");

        const buffer = this.#encodeMessage(
            CommandTypes.MATRIX,
            {objectId: objectId,
                matrix
            }
        );

        this.#socket.send(buffer);
    }

    #encodeMessage ( commandType , {objectId = null, matrix = null}) {
        const encodedString = objectId ? this.#textEncoder.encode(objectId) : null;
        const stringLength = objectId ? encodedString.length : 0;

        const headerSize = 4 + 4;

        let bodySize = 0;
        bodySize += objectId ? 4 + Math.ceil(stringLength / 4) * 4 : 0;
        bodySize += matrix ? 64 : 0;

        const buffer = new ArrayBuffer(headerSize + bodySize);
        const view = new DataView(buffer);
        let offset = 0;

        view.setFloat32(offset, this.#clientId, true); offset += 4;
        view.setFloat32(offset, commandType, true); offset += 4;

        if( objectId ) {
            view.setUint32(offset, stringLength, true); offset += 4;
            new Uint8Array(buffer, offset, stringLength).set(encodedString);
            offset += Math.ceil(stringLength / 4) * 4;
        }

        if( matrix ) {
            const matrixArray = [];
            matrix.toArray(matrixArray);
            for(let i = 0; i < 16; ++i) {
                view.setFloat32(offset, matrixArray[i], true);
                offset += 4;
            }
        }

        return buffer;
    }

    #decodeMessage ( buffer ) {

    }

    // receiveObjectTransform ( objectId, transform ) {

    // }

    emitMessage ( type, data = {} ) {
		console.log("ClientMessageHandler - emitMessage");

        console.log(type, data);
        switch ( type ) {
            case CommandTypes.SELECT:
                this.sendObjectSelect(data.name);
                break;
            case CommandTypes.DESELECT:
                this.sendObjectDeselect(data.name);
                break;
            case CommandTypes.MATRIX:
                this.sendObjectMatrix(data.name, data.matrix);
                break;
            default:
                console.log("unknwon command type");
                break;
        }
    }

    get socket ( ) {
        return this.#socket;
    }
}