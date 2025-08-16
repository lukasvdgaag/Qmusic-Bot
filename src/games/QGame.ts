import {DiscordBot} from "../DiscordBot";

export interface QGame {
    available: boolean;
}

export abstract class AbstractQGame implements QGame {
    protected discordBot: DiscordBot;
    available: boolean = false;

    protected constructor(discordBot: DiscordBot) {
        this.discordBot = discordBot;
        this.init().catch(console.error);
    }

    protected abstract init(): Promise<void>;
}