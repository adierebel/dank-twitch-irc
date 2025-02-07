"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatClient = void 0;
const debugLogger = require("debug-logger");
const ignore_promise_rejections_1 = require("../mixins/ignore-promise-rejections");
const connection_1 = require("../mixins/ratelimiters/connection");
const privmsg_1 = require("../mixins/ratelimiters/privmsg");
const roomstate_tracker_1 = require("../mixins/roomstate-tracker");
const userstate_tracker_1 = require("../mixins/userstate-tracker");
const join_1 = require("../operations/join");
const join_all_1 = require("../operations/join-all");
const part_1 = require("../operations/part");
const ping_1 = require("../operations/ping");
const privmsg_2 = require("../operations/privmsg");
const say_1 = require("../operations/say");
const any_cause_instanceof_1 = require("../utils/any-cause-instanceof");
const find_and_push_to_end_1 = require("../utils/find-and-push-to-end");
const remove_in_place_1 = require("../utils/remove-in-place");
const union_sets_1 = require("../utils/union-sets");
const channel_1 = require("../validation/channel");
const base_client_1 = require("./base-client");
const connection_2 = require("./connection");
const errors_1 = require("./errors");
const reply_1 = require("../validation/reply");
const log = debugLogger("dank-twitch-irc:client");
const alwaysTrue = () => true;
class ChatClient extends base_client_1.BaseClient {
    get wantedChannels() {
        return (0, union_sets_1.unionSets)(this.connections.map((c) => c.wantedChannels));
    }
    get joinedChannels() {
        return (0, union_sets_1.unionSets)(this.connections.map((c) => c.joinedChannels));
    }
    roomStateTracker;
    userStateTracker;
    connectionPool;
    connectionMixins = [];
    connections = [];
    activeWhisperConn;
    constructor(configuration) {
        super(configuration);
        if (this.configuration.installDefaultMixins) {
            this.use(new userstate_tracker_1.UserStateTracker(this));
            this.use(new roomstate_tracker_1.RoomStateTracker());
            this.use(new connection_1.ConnectionRateLimiter(this));
            this.use(new privmsg_1.PrivmsgMessageRateLimiter(this));
        }
        if (this.configuration.ignoreUnhandledPromiseRejections) {
            this.use(new ignore_promise_rejections_1.IgnoreUnhandledPromiseRejectionsMixin());
        }
        this.on("error", (error) => {
            if ((0, any_cause_instanceof_1.anyCauseInstanceof)(error, errors_1.ClientError)) {
                process.nextTick(() => {
                    this.emitClosed(error);
                    this.connections.forEach((conn) => conn.destroy(error));
                });
            }
        });
        this.on("close", () => {
            this.connections.forEach((conn) => conn.close());
        });
    }
    async connect() {
        this.requireConnection();
        if (!this.ready) {
            await new Promise((resolve) => this.once("ready", () => resolve()));
        }
    }
    close() {
        // -> connections are close()d via "close" event listener
        this.emitClosed();
    }
    destroy(error) {
        // we emit onError before onClose just like the standard node.js core modules do
        if (error != null) {
            this.emitError(error);
            this.emitClosed(error);
        }
        else {
            this.emitClosed();
        }
    }
    /**
     * Sends a raw IRC command to the server, e.g. <code>JOIN #forsen</code>.
     *
     * Throws an exception if the passed command contains one or more newline characters.
     *
     * @param command Raw IRC command.
     */
    sendRaw(command) {
        this.requireConnection().sendRaw(command);
    }
    async join(channelName) {
        channelName = (0, channel_1.correctChannelName)(channelName);
        (0, channel_1.validateChannelName)(channelName);
        if (this.connections.some((c) => (0, join_1.joinNothingToDo)(c, channelName))) {
            // are we joined already?
            return;
        }
        const conn = this.requireConnection(maxJoinedChannels(this.configuration.maxChannelCountPerConnection));
        await (0, join_1.joinChannel)(conn, channelName);
    }
    async part(channelName) {
        channelName = (0, channel_1.correctChannelName)(channelName);
        (0, channel_1.validateChannelName)(channelName);
        if (this.connections.every((c) => (0, part_1.partNothingToDo)(c, channelName))) {
            // are we parted already?
            return;
        }
        const conn = this.requireConnection((c) => !(0, part_1.partNothingToDo)(c, channelName));
        await (0, part_1.partChannel)(conn, channelName);
    }
    async joinAll(channelNames) {
        channelNames = channelNames.map((v) => {
            v = (0, channel_1.correctChannelName)(v);
            (0, channel_1.validateChannelName)(v);
            return v;
        });
        const needToJoin = channelNames.filter((channelName) => !this.connections.some((c) => (0, join_1.joinNothingToDo)(c, channelName)));
        const promises = [];
        let idx = 0;
        while (idx < needToJoin.length) {
            const conn = this.requireConnection(maxJoinedChannels(this.configuration.maxChannelCountPerConnection));
            const canJoin = this.configuration.maxChannelCountPerConnection -
                conn.wantedChannels.size;
            const channelsSlice = needToJoin.slice(idx, (idx += canJoin));
            promises.push((0, join_all_1.joinAll)(conn, channelsSlice));
        }
        const errorChunks = await Promise.all(promises);
        return Object.assign({}, ...errorChunks);
    }
    async privmsg(channelName, message) {
        channelName = (0, channel_1.correctChannelName)(channelName);
        (0, channel_1.validateChannelName)(channelName);
        return (0, privmsg_2.sendPrivmsg)(this.requireConnection(), channelName, message);
    }
    async say(channelName, message) {
        channelName = (0, channel_1.correctChannelName)(channelName);
        (0, channel_1.validateChannelName)(channelName);
        await (0, say_1.say)(this.requireConnection(mustNotBeJoined(channelName)), channelName, message);
    }
    async me(channelName, message) {
        channelName = (0, channel_1.correctChannelName)(channelName);
        (0, channel_1.validateChannelName)(channelName);
        await (0, say_1.me)(this.requireConnection(mustNotBeJoined(channelName)), channelName, message);
    }
    /**
     * @param messageID The message ID you want to reply to.
     */
    async reply(channelName, messageID, message) {
        channelName = (0, channel_1.correctChannelName)(channelName);
        (0, channel_1.validateChannelName)(channelName);
        (0, reply_1.validateMessageID)(messageID);
        await (0, say_1.reply)(this.requireConnection(mustNotBeJoined(channelName)), channelName, messageID, message);
    }
    async ping() {
        await (0, ping_1.sendPing)(this.requireConnection());
    }
    newConnection() {
        const conn = new connection_2.SingleConnection(this.configuration);
        log.debug(`Creating new connection (ID ${conn.connectionID})`);
        for (const mixin of this.connectionMixins) {
            conn.use(mixin);
        }
        conn.on("connecting", () => this.emitConnecting());
        conn.on("connect", () => this.emitConnected());
        conn.on("ready", () => this.emitReady());
        conn.on("error", (error) => this.emitError(error));
        conn.on("close", (hadError) => {
            if (hadError) {
                log.warn(`Connection ${conn.connectionID} was closed due to error`);
            }
            else {
                log.debug(`Connection ${conn.connectionID} closed normally`);
            }
            (0, remove_in_place_1.removeInPlace)(this.connections, conn);
            if (this.activeWhisperConn === conn) {
                this.activeWhisperConn = undefined;
            }
            if (!this.closed) {
                this.reconnectFailedConnection(conn);
            }
        });
        // forward commands issued by this client
        conn.on("rawCommmand", (cmd) => this.emit("rawCommmand", cmd));
        // forward events to this client
        conn.on("message", (message) => {
            // only forward whispers from the currently active whisper connection
            if (message.ircCommand === "WHISPER") {
                if (this.activeWhisperConn == null) {
                    this.activeWhisperConn = conn;
                }
                if (this.activeWhisperConn !== conn) {
                    // message is ignored.
                    return;
                }
            }
            this.emitMessage(message);
        });
        conn.connect();
        this.connections.push(conn);
        return conn;
    }
    use(mixin) {
        mixin.applyToClient(this);
    }
    reconnectFailedConnection(conn) {
        // rejoin channels, creates connections on demand
        const channels = Array.from(conn.wantedChannels);
        if (channels.length > 0) {
            //noinspection JSIgnoredPromiseFromCall
            this.joinAll(channels);
        }
        else if (this.connections.length <= 0) {
            // this ensures that clients with zero joined channels stay connected (so they can receive whispers)
            this.requireConnection();
        }
        this.emit("reconnect", conn);
    }
    /**
     * Finds a connection from the list of connections that satisfies the given predicate,
     * or if none was found, returns makes a new connection. This means that the given predicate must be specified
     * in a way that a new connection always satisfies it.
     *
     * @param predicate The predicate the connection must fulfill.
     */
    requireConnection(predicate = alwaysTrue) {
        return ((0, find_and_push_to_end_1.findAndPushToEnd)(this.connections, predicate) || this.newConnection());
    }
}
exports.ChatClient = ChatClient;
function maxJoinedChannels(maxChannelCount) {
    return (conn) => conn.wantedChannels.size < maxChannelCount;
}
function mustNotBeJoined(channelName) {
    return (conn) => !conn.wantedChannels.has(channelName) &&
        !conn.joinedChannels.has(channelName);
}
//# sourceMappingURL=client.js.map