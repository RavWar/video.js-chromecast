/**
 * @file chromecast-button.js
 */
import videojs from 'video.js';

const Component = videojs.getComponent('Component');
const Button = videojs.getComponent('Button');

/**
 * The base class for buttons that toggle chromecast video
 *
 * @param {Player|Object} player
 * @param {Object=} options
 * @extends Button
 * @class ChromeCastButton
 */
class ChromeCastButton extends Button {
    constructor (player, options) {
        super(player, options);
        this.hide();
        player.chromecast = this;
    }

    /**
     * Init chromecast sdk api
     *
     * @method initializeApi
     */
    initializeApi () {
        let apiConfig;
        let appId;
        let sessionRequest;

        appId = this.options_.appId || chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;
        sessionRequest = new chrome.cast.SessionRequest(appId);
        apiConfig = new chrome.cast.ApiConfig(sessionRequest, ::this.sessionJoinedListener, ::this.receiverListener, chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED, chrome.cast.DefaultActionPolicy.CAST_THIS_TAB);
        return chrome.cast.initialize(apiConfig, ::this.onInitSuccess, ::this.castError);
    }

    castError (castError) {
        let error = {
            code: castError.code,
            message: castError.description
        };

        switch (castError.code) {
            case chrome.cast.ErrorCode.API_NOT_INITIALIZED:
            case chrome.cast.ErrorCode.EXTENSION_MISSING:
            case chrome.cast.ErrorCode.EXTENSION_NOT_COMPATIBLE:
            case chrome.cast.ErrorCode.INVALID_PARAMETER:
            case chrome.cast.ErrorCode.LOAD_MEDIA_FAILED:
            case chrome.cast.ErrorCode.RECEIVER_UNAVAILABLE:
            case chrome.cast.ErrorCode.SESSION_ERROR:
            case chrome.cast.ErrorCode.CHANNEL_ERROR:
            case chrome.cast.ErrorCode.TIMEOUT:
                this.addClass('error');
                break;
            case chrome.cast.ErrorCode.CANCEL:
                break;
            default:
                this.player_.error(error);
                break;
        }
        return videojs.log('Cast Error: ' + (JSON.stringify(castError)));
    }

    onInitSuccess () {
        return this.apiInitialized = true;
    }

    sessionJoinedListener (session) {
        if (session.media.length) {
            this.apiSession = session;
            this.onMediaDiscovered(session.media[0]);
        }
    }

    receiverListener (availability) {
        if (availability === 'available') {
            return this.show();
        }
    }

    doLaunch () {
        if (this.apiInitialized) {
            return chrome.cast.requestSession(::this.onSessionSuccess, ::this.castError);
        } else {
            return videojs.log('Session not initialized');
        }
    }

    onSessionSuccess (session) {
        let image;
        let key;
        let loadRequest;
        let mediaInfo;
        let ref;
        let value;

        this.apiSession = session;
        const source = this.player_.cache_.src;
        const type = this.player_.currentType();

        mediaInfo = new chrome.cast.media.MediaInfo(source, type);
        mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
        if (this.options_.metadata) {
            ref = this.options_.metadata;
            for (key in ref) {
                value = ref[key];
                mediaInfo.metadata[key] = value;
            }

        }
        //Add poster image on player
        const poster = this.player().poster();
        if (poster) {
            image = new chrome.cast.Image(poster);
            mediaInfo.metadata.images = [image];
        }

        // Load/Add caption tracks
        let plTracks = this.player().textTracks();
        let tracks = [];
        let i = 0;
        let plTrack;
        let trackId = 0;
        let track;
        if (plTracks) {
            for (i = 0; i < plTracks.length; i++) {
                plTrack = plTracks.tracks_[i];
                trackId++;
                track = new chrome.cast.media.Track(trackId, chrome.cast.media.TrackType.TEXT);
                track.trackContentId = plTrack.src.indexOf('//') >= 0 ? plTrack.src : location.origin + plTrack.src;
                track.trackContentType = 'text/vtt';
                track.subtype = chrome.cast.media.TextTrackType.SUBTITLES;
                track.name = plTrack.label;
                track.language = plTrack.language;
                track.customData = null;
                tracks.push(track);
            }
            mediaInfo.textTrackStyle = new chrome.cast.media.TextTrackStyle();
            mediaInfo.textTrackStyle.fontScale = 1.15;
            mediaInfo.textTrackStyle.fontFamily = 'Arial';
            mediaInfo.textTrackStyle.foregroundColor = '#FFCC66FF';
            mediaInfo.textTrackStyle.backgroundColor = '#000000СС';
            mediaInfo.textTrackStyle.edgeType = chrome.cast.media.TextTrackEdgeType.NONE;
            mediaInfo.textTrackStyle.windowType = chrome.cast.media.TextTrackWindowType.NONE;
        }

        if (tracks.length) {
            mediaInfo.tracks = tracks;
        }

        // Request load media source
        loadRequest = new chrome.cast.media.LoadRequest(mediaInfo);

        loadRequest.autoplay = true;
        loadRequest.currentTime = this.player_.currentTime();

        this.apiSession.loadMedia(loadRequest, ::this.onMediaDiscovered, ::this.castError);
        this.apiSession.addUpdateListener(::this.onSessionUpdate);
    }

    onMediaDiscovered (media) {
        this.player_.loadTech_('Chromecast', {
            type: 'cast',
            apiMedia: media,
            apiSession: this.apiSession
        });

        this.casting = true;
        this.inactivityTimeout = this.player_.options_.inactivityTimeout;
        this.player_.options_.inactivityTimeout = 0;
        this.player_.userActive(true);
        this.addClass('connected');
        this.removeClass('error');
    }

    onSessionUpdate (isAlive) {
        if (!this.player_.apiMedia) {
            return;
        }
        if (!isAlive) {
            return this.onStopAppSuccess();
        }
    }

    stopCasting () {
        return this.apiSession.stop(::this.onStopAppSuccess, ::this.castError);
    }

    onStopAppSuccess () {
        this.casting = false;
        let time = this.player_.currentTime();
        this.removeClass('connected');
        this.player_.src(this.player_.options_['sources']);
        if (!this.player_.paused()) {
            this.player_.one('seeked', function () {
                return this.player_.play();
            });
        }
        this.player_.currentTime(time);
        this.player_.options_.inactivityTimeout = this.inactivityTimeout;
        return this.apiSession = null;
    }

    /**
     * Allow sub components to stack CSS class names
     *
     * @return {String} The constructed class name
     * @method buildCSSClass
     */
    buildCSSClass () {
        return `vjs-chromecast-button ${super.buildCSSClass()}`;
    }

    /**
     * Handle click on mute
     * @method handleClick
     */
    handleClick () {
        super.handleClick();
        if (this.casting) {
            return this.stopCasting();
        } else {
            return this.doLaunch();
        }
    }
}

ChromeCastButton.prototype.inactivityTimeout = 2000;
ChromeCastButton.prototype.controlText_ = 'Chromecast';

Component.registerComponent('ChromeCastButton', ChromeCastButton);
export default ChromeCastButton;
