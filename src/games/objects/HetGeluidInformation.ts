export class HetGeluidInformation {

    amount: number;
    audio?: string;

    constructor(amount: number, audio?: string) {
        this.amount = amount;
        this.audio = audio;
    }

    static fromData = (data: any): HetGeluidInformation => {
        return new HetGeluidInformation(data.amount, data.audio);
    }

    /**
     * Get the name of the audio file
     */
    getAudioName = (): string | undefined => {
        return this.audio?.split('/')?.pop();
    }

}
