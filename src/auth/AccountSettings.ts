export interface IAccountSettings {
    catch_the_summer_hit: {
        enabled: boolean;
        notify: boolean;
        catch_at_night: boolean;
    };
    catch_the_artist: {
        enabled: boolean;
        artist_name?: string | null;
        notify: boolean;
        send_app_message: boolean;
        notify_when_upcoming: boolean;
    };
    het_geluid: {
        auto_signup: boolean;
    };
}

export class AccountSettings implements IAccountSettings {

    catch_the_summer_hit = {
        enabled: true,
        notify: true,
        catch_at_night: true,
    };

    catch_the_artist = {
        enabled: false,
        artist_name: null,
        notify: true,
        send_app_message: false,
        notify_when_upcoming: false,
    };

    het_geluid = {
        auto_signup: false,
    };

    constructor(jsonData?: IAccountSettings) {
        this.loadSettings(jsonData);
    }

    private loadSettings = (jsonData?: IAccountSettings) => {
        if (!jsonData) return;
        Object.assign(this.catch_the_summer_hit, jsonData.catch_the_summer_hit);
        Object.assign(this.catch_the_artist, jsonData.catch_the_artist);
        Object.assign(this.het_geluid, jsonData.het_geluid);
    }
}
