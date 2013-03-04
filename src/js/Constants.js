( function() {

    /**
     * Constants.js is the first file to be included from index.html, so it will
     * contain our top-level objects, e.g. the game. These aren't technically
     * constants, but they need to be defined somewhere.
     */
    window.game = {};
    window.ui = {};
    window.game.util = {};

    /**
     * The relative path from Javascript files to the resource folder.
     */
    window.game.resourcePath = "../res";

    /**
     * The relative path from Javascript files to the image folder.
     */
    window.game.imagePath = window.game.resourcePath + "/img";

    /**
     * One thousand divided by this number is the target framerate.
     * @type {Number}
     */
    window.game.msPerFrame = 16;

}());