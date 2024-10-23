export interface HetGeluidAttempt {
    answer: string;
    name: string;
    location: string;
    guessed_at: Date;
}

export const highlightQueryInAnswer = (answer: string, query: string) => {
    return answer.replace(new RegExp(`(${query})`, 'gi'), '**__$1__**');
}
