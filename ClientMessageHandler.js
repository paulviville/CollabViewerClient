import CommandTypes from "./Synchronizer/CommandTypes.js";

export default class ClientMessageHandler {
    #address;
    #socket;

    constructor ( address ) {
		console.log("ClientMessageHandler - constructor");
        this.#address = address;

    }

    connect ( ) {

    }

    setSynchronizer ( sceneSynchronizer ) {

    }


}