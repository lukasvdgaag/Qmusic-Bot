export interface SignUpMoment {
    id: number;
    visibleAt: Date;
    hiddenAt: Date;
}

export const getSignUpMomentFromJson = (json: any): SignUpMoment => {
    const {id, visibleAt, hiddenAt} = json.current_moment;
    return {
        id,
        visibleAt: new Date(visibleAt),
        hiddenAt: new Date(hiddenAt),
    }
}