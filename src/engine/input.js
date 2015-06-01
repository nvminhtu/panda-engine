/**
    @module input
**/
game.module(
    'engine.input'
)
.body(function() {

/**
    @class Input
    @constructor
    @param {HTMLCanvasElement} canvas
**/
game.createClass('Input', {
    /**
        List of interactive objects.
        @property {Array} items
    **/
    items: [],
    /**
        List of current touches.
        @property {Array} touches
    **/
    touches: [],
    /**
        @property {Boolean} _needUpdate
        @default false
        @private
    **/
    _needUpdate: false,
    /**
        @property {Number} _mouseDownTime
        @private
    **/
    _mouseDownTime: null,
    /**
        @property {Container} _mouseDownItem
        @private
    **/
    _mouseDownItem: null,
    /**
        @property {Container} _mouseUpItem
        @private
    **/
    _mouseUpItem: null,

    init: function(canvas) {
        var target = game.device.cocoonCanvasPlus ? window : canvas;
        target.addEventListener('touchstart', this._touchstart.bind(this));
        target.addEventListener('touchmove', this._touchmove.bind(this));
        target.addEventListener('touchend', this._touchend.bind(this));
        target.addEventListener('touchcancel', this._touchend.bind(this));
        target.addEventListener('mousedown', this._mousedown.bind(this));
        target.addEventListener('mousemove', this._mousemove.bind(this));
        window.addEventListener('mouseup', this._mouseup.bind(this));
    },

    /**
        @method _touchstart
        @param {TouchEvent} event
        @private
    **/
    _touchstart: function(event) {
        this._preventDefault(event);
        for (var i = 0; i < event.changedTouches.length; i++) {
            var touch = event.changedTouches[i];
            this.touches.push(touch);
            this._mousedown(touch);
        }
    },

    /**
        @method _touchmove
        @param {TouchEvent} event
        @private
    **/
    _touchmove: function(event) {
        this._preventDefault(event);
        for (var i = 0; i < event.changedTouches.length; i++) {
            this._mousemove(event.changedTouches[i]);
        }
    },

    /**
        @method _touchend
        @param {TouchEvent} event
        @private
    **/
    _touchend: function(event) {
        this._preventDefault(event);
        for (var i = 0; i < event.changedTouches.length; i++) {
            var touch = event.changedTouches[i];
            for (var o = this.touches.length - 1; o >= 0; o--) {
                if (this.touches[o].identifier === touch.identifier) {
                    this.touches.splice(o, 1);
                    break;
                }
            }
            this._mouseup(touch);
        }
    },

    /**
        @method _mousedown
        @param {MouseEvent|TouchEvent} event
        @private
    **/
    _mousedown: function(event) {
        this._preventDefault(event);
        this._calculateXY(event);
        
        this._mouseDownItem = this._processEvent('mousedown', event);
        this._mouseDownTime = game.Timer.time;

        if (game.scene._mousedown && !this._mouseDownItem) {
            game.scene._mousedown(event.canvasX, event.canvasY, event.identifier, event);
        }
    },

    /**
        @method _mousemove
        @param {MouseEvent|TouchEvent} event
        @private
    **/
    _mousemove: function(event) {
        this._preventDefault(event);
        this._calculateXY(event);
        
        var _mouseMoveItem = this._processEvent('mousemove', event);
        if (this._mouseMoveItem && this._mouseMoveItem !== _mouseMoveItem) {
            this._mouseMoveItem.mouseout(event.canvasX, event.canvasY, event.identifier, event);
        }
        this._mouseMoveItem = _mouseMoveItem;

        if (game.scene._mousemove && !this._mouseMoveItem) {
            game.scene._mousemove(event.canvasX, event.canvasY, event.identifier, event);
        }
    },

    /**
        @method _mouseup
        @param {MouseEvent|TouchEvent} event
        @private
    **/
    _mouseup: function(event) {
        this._preventDefault(event);
        this._calculateXY(event);

        this._mouseUpItem = this._processEvent('mouseup', event);
        if (this._mouseDownItem && this._mouseDownItem === this._mouseUpItem) {
            var time = game.Timer.time - this._mouseDownTime;
            if (game.Input.clickTimeout === 0 || time < game.Input.clickTimeout) {
                this._mouseDownItem.click(event.canvasX, event.canvasY, event.identifier, event);
            }
        }

        if (game.scene._mouseup && !this._mouseUpItem) {
            game.scene._mouseup(event.canvasX, event.canvasY, event.identifier, event);
        }
    },

    /**
        @method _preventDefault
        @param {MouseEvent|TouchEvent} event
        @private
    **/
    _preventDefault: function(event) {
        if (!event.preventDefault || !game.Input.preventDefault) return;
        event.preventDefault();
    },

    /**
        @method _processEvent
        @param {String} eventName
        @param {MouseEvent|TouchEvent} event
        @return {Object} item
        @private
    **/
    _processEvent: function(eventName, event) {
        for (var i = this.items.length - 1; i >= 0; i--) {
            var item = this.items[i];
            if (item._interactive && this._hitTest(item, event.canvasX, event.canvasY)) {
                if (!item[eventName](event.canvasX, event.canvasY, event.identifier, event)) {
                    return item;
                }
            }
        }
    },

    /**
        @method _calculateXY
        @param {MouseEvent|TouchEvent} event
        @private
    **/
    _calculateXY: function(event) {
        var rect = game.renderer.canvas.getBoundingClientRect();
        var x = (event.clientX - rect.left) * (game.renderer.canvas.width / rect.width);
        var y = (event.clientY - rect.top) * (game.renderer.canvas.height / rect.height);
        event.canvasX = x / game.scale;
        event.canvasY = y / game.scale;
    },

    /**
        @method _hitTest
        @param {Container} container
        @param {Number} x
        @param {Number} y
        @return {Boolean}
        @private
    **/
    _hitTest: function(container, x, y) {
        var hitArea = container.hitArea;
        if (hitArea) {
            var wt = container._worldTransform;
            var bounds = container._getBounds();
            var ax = (container.anchor.x * container.scale.x / container.width) || 0;
            var ay = (container.anchor.y * container.scale.y / container.height) || 0;
            var hx = wt.tx + hitArea.x;
            var hy = wt.ty + hitArea.y;
            var hw = hitArea.width * wt.a;
            var hh = hitArea.height * wt.d;
            hx += container.anchor.x * container.scale.x - hw * ax;
            hy += container.anchor.y * container.scale.y - hh * ay;
        }
        else {
            hitArea = container._getBounds();
            var hx = hitArea.x;
            var hy = hitArea.y;
            var hw = hitArea.width;
            var hh = hitArea.height;
        }

        return (x >= hx && y >= hy && x <= hx + hw && y <= hy + hh);
    },

    /**
        @method _updateItems
        @param {Container} container
        @private
    **/
    _updateItems: function(container) {
        for (var i = 0; i < container.children.length; i++) {
            var child = container.children[i];
            if (child._interactive) this.items.push(child);
            if (child.children.length > 0) this._updateItems(child);
        }
    },

    /**
        @method _update
        @private
    **/
    _update: function() {
        if (!this._needUpdate) return;

        this.items.length = 0;
        this._updateItems(game.scene.stage);
    }
});

game.addAttributes('Input', {
    /**
        Time after click is not called (ms).
        @attribute {Number} clickTimeout
        @default 500
    **/
    clickTimeout: 500,
    /**
        Should events prevent default action.
        @attribute {Boolean} preventDefault
        @default true
    **/
    preventDefault: true
});

/**
    @class Keyboard
**/
game.createClass('Keyboard', {
    /**
        @property {Array} _keysDown
        @private
    **/
    _keysDown: [],

    init: function() {
        window.addEventListener('keydown', this._keydown.bind(this));
        window.addEventListener('keyup', this._keyup.bind(this));
        window.addEventListener('blur', this._resetKeys.bind(this));
    },

    /**
        Check if key is pressed down.
        @method down
        @param {String} key
        @return {Boolean}
    **/
    down: function(key) {
        return !!this._keysDown[key];
    },

    /**
        @method _resetKeys
        @private
    **/
    _resetKeys: function() {
        for (var key in this._keysDown) {
            this._keysDown[key] = false;
        }
    },

    /**
        @method _keydown
        @param {KeyboardEvent} event
        @private
    **/
    _keydown: function(event) {
        if (!game.Keyboard.keys[event.keyCode]) {
            // Unknown key
            game.Keyboard.keys[event.keyCode] = event.keyCode;
        }

        this._keysDown[game.Keyboard.keys[event.keyCode]] = true;
        if (game.scene && game.scene.keydown) {
            var prevent = game.scene.keydown(game.Keyboard.keys[event.keyCode], this.down('SHIFT'), this.down('CTRL'), this.down('ALT'));
            if (prevent) event.preventDefault();
        }
    },

    /**
        @method _keyup
        @param {KeyboardEvent} event
        @private
    **/
    _keyup: function(event) {
        this._keysDown[game.Keyboard.keys[event.keyCode]] = false;
        if (game.scene && game.scene.keyup) {
            game.scene.keyup(game.Keyboard.keys[event.keyCode]);
        }
    }
});

game.addAttributes('Keyboard', {
    /**
        List of available keys.
        @attribute {Object} keys
    **/
    keys: {
        8: 'BACKSPACE',
        9: 'TAB',
        13: 'ENTER',
        16: 'SHIFT',
        17: 'CTRL',
        18: 'ALT',
        19: 'PAUSE',
        20: 'CAPS_LOCK',
        27: 'ESC',
        32: 'SPACE',
        33: 'PAGE_UP',
        34: 'PAGE_DOWN',
        35: 'END',
        36: 'HOME',
        37: 'LEFT',
        38: 'UP',
        39: 'RIGHT',
        40: 'DOWN',
        44: 'PRINT_SCREEN',
        45: 'INSERT',
        46: 'DELETE',
        48: '0',
        49: '1',
        50: '2',
        51: '3',
        52: '4',
        53: '5',
        54: '6',
        55: '7',
        56: '8',
        57: '9',
        65: 'A',
        66: 'B',
        67: 'C',
        68: 'D',
        69: 'E',
        70: 'F',
        71: 'G',
        72: 'H',
        73: 'I',
        74: 'J',
        75: 'K',
        76: 'L',
        77: 'M',
        78: 'N',
        79: 'O',
        80: 'P',
        81: 'Q',
        82: 'R',
        83: 'S',
        84: 'T',
        85: 'U',
        86: 'V',
        87: 'W',
        88: 'X',
        89: 'Y',
        90: 'Z',
        96: 'NUM_ZERO',
        97: 'NUM_ONE',
        98: 'NUM_TWO',
        99: 'NUM_THREE',
        100: 'NUM_FOUR',
        101: 'NUM_FIVE',
        102: 'NUM_SIX',
        103: 'NUM_SEVEN',
        104: 'NUM_EIGHT',
        105: 'NUM_NINE',
        106: 'NUM_MULTIPLY',
        107: 'NUM_PLUS',
        109: 'NUM_MINUS',
        110: 'NUM_PERIOD',
        111: 'NUM_DIVISION',
        112: 'F1',
        113: 'F2',
        114: 'F3',
        115: 'F4',
        116: 'F5',
        117: 'F6',
        118: 'F7',
        119: 'F8',
        120: 'F9',
        121: 'F10',
        122: 'F11',
        123: 'F12',
        186: 'SEMICOLON',
        187: 'PLUS',
        189: 'MINUS',
        192: 'GRAVE_ACCENT',
        222: 'SINGLE_QUOTE'
    }
});

});
