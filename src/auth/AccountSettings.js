class AccountSettings {

    catch_the_summer_hit = {
        enabled: true,
        notify: true,
        catch_at_night: true,
    }

    catch_the_artist = {
        enabled: false,
        artist_name: null,
        notify: true,
        send_app_message: false,
        notify_when_upcoming: false,
    }

    het_geluid = {
        auto_signup: false,
    }

    constructor(jsonData) {
        this.#loadCatchTheSummerHit(jsonData.catch_the_summer_hit);
        this.#loadCatchTheArtist(jsonData.catch_the_artist);
        this.#loadHetGeluid(jsonData.het_geluid);
    }

    #loadCatchTheSummerHit(jsonData) {
        this.catch_the_summer_hit = {
            enabled: jsonData?.enabled ?? this.catch_the_summer_hit.enabled,
            notify: jsonData?.notify ?? this.catch_the_summer_hit.notify,
            catch_at_night: jsonData?.catch_at_night ?? this.catch_the_summer_hit.catch_at_night,
        }
    }

    #loadCatchTheArtist(jsonData) {
        this.catch_the_artist = {
            enabled: jsonData?.enabled ?? this.catch_the_artist.enabled,
            artist_name: jsonData?.artist_name ?? this.catch_the_artist.artist_name,
            notify: jsonData?.notify ?? this.catch_the_artist.notify,
            send_app_message: jsonData?.send_app_message ?? this.catch_the_artist.send_app_message,
            notify_when_upcoming: jsonData?.notify_when_upcoming ?? this.catch_the_artist.notify_when_upcoming,
        }
    }

    #loadHetGeluid(jsonData) {
        this.het_geluid = {
            auto_signup: jsonData?.auto_signup ?? this.het_geluid.auto_signup,
        }
    }

}

module.exports = AccountSettings;