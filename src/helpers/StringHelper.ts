export const escapeMessage = (input: string): string => {
    input = input.replace(/\\\\\\"/g, '\\\\"');
    input = input.replace(/\\"/g, '"');
    return input;
}