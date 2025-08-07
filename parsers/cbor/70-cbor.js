
module.exports = function (RED) {
    "use strict";
    var cbor = require('cbor-x');

    // convert types that JSON stringify does not support
    function replacer(key, value) {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        if (value instanceof Buffer || value instanceof Uint8Array) {
            return value.toString('base64');
        }
        if (value instanceof Map) {
            return Array.from(value.entries());
        }
        if (value instanceof Set) {
            return Array.from(value);
        }
        if (value instanceof RegExp) {
            return value.toString();
        }
        return value;
    }

    function CborNode(n) {
        RED.nodes.createNode(this, n);
        this.property = n.property || "payload";
        var node = this;
        this.on("input", function (msg) {
            var value = RED.util.getMessageProperty(msg, node.property);
            if (value !== undefined) {
                if (Buffer.isBuffer(value)) {
                    var l = value.length;
                    try {
                        value = cbor.decode(value);
                        RED.util.setMessageProperty(msg, node.property, value);
                        node.send(msg);
                        // update status
                        var valueLength = value.length;
                        var replacedValueLength = JSON.stringify(value, replacer).length;
                        var textValue = `${valueLength} b->o ${replacedValueLength}`;
                        node.status({ text: textValue });
                    }
                    catch (e) {
                        node.error(`Bad decode - ${e.message}`, msg);
                        node.status({ text: "not a cbor buffer" });
                    }
                }
                else {
                    var le = JSON.stringify(value, replacer).length;
                    value = cbor.encode(value);
                    RED.util.setMessageProperty(msg, node.property, value);
                    node.send(msg);
                    // update status
                    var valueLengthAsString = value.length.toString();
                    var replacedValuesLengthAsString = JSON.stringify(value, replacer).length;
                    var textValue = `${valueLengthAsString} b->o ${replacedValuesLengthAsString}`;
                    node.status({ text: textValue });
                }
            }
            else { node.warn("No payload found to process"); }
        });
    }
    RED.nodes.registerType("cbor", CborNode);
}
