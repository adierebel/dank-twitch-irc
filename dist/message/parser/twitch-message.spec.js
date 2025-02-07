"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const irc_message_1 = require("../irc/irc-message");
const cap_1 = require("../twitch-types/cap");
const clearchat_1 = require("../twitch-types/clearchat");
const clearmsg_1 = require("../twitch-types/clearmsg");
const ping_1 = require("../twitch-types/connection/ping");
const pong_1 = require("../twitch-types/connection/pong");
const reconnect_1 = require("../twitch-types/connection/reconnect");
const globaluserstate_1 = require("../twitch-types/globaluserstate");
const hosttarget_1 = require("../twitch-types/hosttarget");
const join_1 = require("../twitch-types/membership/join");
const part_1 = require("../twitch-types/membership/part");
const notice_1 = require("../twitch-types/notice");
const privmsg_1 = require("../twitch-types/privmsg");
const roomstate_1 = require("../twitch-types/roomstate");
const usernotice_1 = require("../twitch-types/usernotice");
const userstate_1 = require("../twitch-types/userstate");
const whisper_1 = require("../twitch-types/whisper");
const irc_message_2 = require("./irc-message");
const twitch_message_1 = require("./twitch-message");
describe("./message/parser/twitch-message", function () {
    describe("#parseTwitchpMessage", function () {
        const testCases = [
            {
                irc: "@ban-duration=5;room-id=11148817;target-user-id=70948394;tmi-sent-ts=1562587662677 " +
                    ":tmi.twitch.tv CLEARCHAT #pajlada :weeb123",
                instanceOf: clearchat_1.ClearchatMessage,
            },
            {
                irc: "@login=supinic;room-id=;target-msg-id=e8a4dcfe-9db3-43eb-98d4-b5101ba6a20e;" +
                    "tmi-sent-ts=-6795364578871 :tmi.twitch.tv CLEARMSG #pajlada :this is retarded",
                instanceOf: clearmsg_1.ClearmsgMessage,
            },
            {
                irc: "@badge-info=;badges=;color=;display-name=receivertest3;emote-sets=0;user-id=" +
                    "422021310;user-type= :tmi.twitch.tv GLOBALUSERSTATE",
                instanceOf: globaluserstate_1.GlobaluserstateMessage,
            },
            {
                irc: ":tmi.twitch.tv HOSTTARGET #randers :redshell 0",
                instanceOf: hosttarget_1.HosttargetMessage,
            },
            {
                irc: "@msg-id=host_on :tmi.twitch.tv NOTICE #randers :Now hosting Redshell.",
                instanceOf: notice_1.NoticeMessage,
            },
            {
                irc: "@badge-info=subscriber/10;badges=moderator/1,subscriber/6,sub-gifter/1;" +
                    "color=#19E6E6;display-name=randers;emotes=;flags=;id=0e7f0a13-3885-42a3-ab23-722b874eb864;" +
                    "mod=1;room-id=11148817;subscriber=1;tmi-sent-ts=1562588302071;turbo=0;user-id=40286300;" +
                    "user-type=mod :randers!randers@randers.tmi.twitch.tv PRIVMSG #pajlada :asd",
                instanceOf: privmsg_1.PrivmsgMessage,
            },
            {
                irc: "@badge-info=predictions/foo\\sbar\\\\n\\sbaz;badges=predictions/blue-1;" +
                    "client-nonce=15debb48897591dc6c0e8f1df61ee07b;color=#D2691E;display-name=BeFriendlier;" +
                    "emotes=;first-msg=0;flags=;id=58eef077-2f04-43ed-9624-5407fd1fd366;mod=0;room-id=99631238;" +
                    "subscriber=0;tmi-sent-ts=1653494875994;turbo=0;user-id=23729448;" +
                    "user-type= :befriendlier!befriendlier@befriendlier.tmi.twitch.tv PRIVMSG #zneix :-tags",
                instanceOf: privmsg_1.PrivmsgMessage,
            },
            {
                irc: "@badge-info=predictions/<<<<<<\\sHEAD[15A⸝asdf/test,founder/17;badges=predictions/pink-2,vip/1,founder/0,bits/1;" +
                    "client-nonce=9b836e232170a9df213aefdcb458b67e;color=#696969;display-name=NotKarar;emotes=;first-msg=0;flags=;" +
                    "id=e00881bd-5f21-4993-8bbd-1736cd13d42e;mod=0;room-id=99631238;subscriber=1;tmi-sent-ts=1653494879409;turbo=0;" +
                    "user-id=89954186;user-type= :notkarar!notkarar@notkarar.tmi.twitch.tv PRIVMSG #zneix :-tags",
                instanceOf: privmsg_1.PrivmsgMessage,
            },
            {
                irc: "@emote-only=1;room-id=40286300 :tmi.twitch.tv ROOMSTATE #randers",
                instanceOf: roomstate_1.RoomstateMessage,
            },
            {
                irc: "@badge-info=;badges=subscriber/0,premium/1;color=;display-name=FletcherCodes;" +
                    "emotes=;flags=;id=57cbe8d9-8d17-4760-b1e7-0d888e1fdc60;login=fletchercodes;mod=0;" +
                    "msg-id=sub;msg-param-cumulative-months=0;msg-param-months=0;" +
                    "msg-param-should-share-streak=0;msg-param-sub-plan-name=The\\sWhatevas;" +
                    "msg-param-sub-plan=Prime;room-id=408892348;subscriber=1;system-msg=fletchercodes" +
                    "\\ssubscribed\\swith\\sTwitch\\sPrime.;tmi-sent-ts=1551486064328;" +
                    "turbo=0;user-id=269899575;user-type= :tmi.twitch.tv USERNOTICE #clippyassistant",
                instanceOf: usernotice_1.UsernoticeMessage,
            },
            {
                irc: "@badge-info=subscriber/12;badges=subscriber/12,premium/1;color=;display-name=yurixxxxx14;" +
                    "emotes=;flags=;id=99b77ba7-c77f-4d92-ac3a-ad556e921672;login=yurixxxxx14;mod=0;msg-id=submysterygift;" +
                    "msg-param-mass-gift-count=1;msg-param-origin-id=4e\\sd1\\s19\\sc5\\s33\\s80\\s68\\" +
                    "s8c\\sdc\\sc9\\s4d\\s96\\s73\\sd0\\sad\\s40\\s52\\sf3\\s19\\s02;" +
                    "msg-param-sender-count=1;msg-param-sub-plan=1000;room-id=38884180;subscriber=1;" +
                    "system-msg=yurixxxxx14\\sis\\sgifting\\s1\\sTier\\s1\\sSubs\\sto\\susertag's\\scommunity!" +
                    "\\sThey've\\sgifted\\sa\\stotal\\sof\\s1\\sin\\sthe\\schannel!;tmi-sent-ts=1633549401426;" +
                    "user-id=238886165;user-type= :tmi.twitch.tv USERNOTICE #usertag",
                instanceOf: usernotice_1.UsernoticeMessage,
            },
            {
                irc: "@badge-info=;badges=;color=;display-name=receivertest3;emote-sets=0;mod=0;" +
                    "subscriber=0;user-type= :tmi.twitch.tv USERSTATE #randers",
                instanceOf: userstate_1.UserstateMessage,
            },
            {
                irc: "@badges=;color=#19E6E6;display-name=randers;emotes=;message-id=1;" +
                    "thread-id=40286300_422021310;turbo=0;user-id=40286300;user-type= " +
                    ":randers!randers@randers.tmi.twitch.tv WHISPER receivertest3 :test",
                instanceOf: whisper_1.WhisperMessage,
            },
            {
                irc: ":receivertest3!receivertest3@receivertest3.tmi.twitch.tv JOIN #randers",
                instanceOf: join_1.JoinMessage,
            },
            {
                irc: ":receivertest3!receivertest3@receivertest3.tmi.twitch.tv PART #randers",
                instanceOf: part_1.PartMessage,
            },
            {
                irc: ":tmi.twitch.tv RECONNECT",
                instanceOf: reconnect_1.ReconnectMessage,
            },
            {
                irc: ":tmi.twitch.tv PING",
                instanceOf: ping_1.PingMessage,
            },
            {
                irc: "PONG :tmi.twitch.tv",
                instanceOf: pong_1.PongMessage,
            },
            {
                irc: ":tmi.twitch.tv CAP * ACK :twitch.tv/commands twitch.tv/tags",
                instanceOf: cap_1.CapMessage,
            },
        ];
        for (const { irc, instanceOf } of testCases) {
            const ircMessage = (0, irc_message_2.parseIRCMessage)(irc);
            const command = ircMessage.ircCommand;
            it(`should map ${command} to ${instanceOf.name}`, function () {
                const twitchMessage = (0, twitch_message_1.parseTwitchMessage)(irc);
                chai_1.assert.instanceOf(twitchMessage, instanceOf);
            });
        }
        it("should leave unknown commands as bare IRCMessages", function () {
            const parsed = (0, twitch_message_1.parseTwitchMessage)(":tmi.twitch.tv UNKNOWN");
            chai_1.assert.strictEqual(Object.getPrototypeOf(parsed), irc_message_1.IRCMessage.prototype);
        });
        it("should leave numeric commands as bare IRCMessages", function () {
            const parsed = (0, twitch_message_1.parseTwitchMessage)(":tmi.twitch.tv 001");
            chai_1.assert.strictEqual(Object.getPrototypeOf(parsed), irc_message_1.IRCMessage.prototype);
        });
    });
});
//# sourceMappingURL=twitch-message.spec.js.map