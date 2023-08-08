import Config from 'config';

const DELIMITER = '#';

export async function replaceKey(input: string): Promise<string> {
    const sections = input.split(DELIMITER);

    // If the delimiter is not in the input exactly twice, do nothing
    if (sections.length !== 3) return input;

    const keyName = sections[1];
    const fileName = `${Config.environment}_k_${btoa(keyName)}`;
    const encodedKey = await fetch(`/${fileName}`)
        .then((res) => res.text())
        .then((text) => text.replace(/\s/g, '')); // Remove any whitespace & newlines

    // Replace the key name with the key itself
    sections[1] = atob(encodedKey);

    // Create the resulting string without the delimiters
    return sections.join('');
}
