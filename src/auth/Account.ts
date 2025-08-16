import {IAccountSettings} from "./AccountSettings";

export interface Account {
    username: string;
    password: string;
    settings: IAccountSettings;
    discord_id?: string;
    expires?: number;
    token?: string | null;
}
