const convertCase = (converter: (key: string) => string) => (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => convertCase(converter)(item));
    }

    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            newObj[converter(key)] = convertCase(converter)(obj[key]);
        }
    }
    return newObj;
};

const snakeCaseConverter = (key: string) => key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const camelCaseConverter = (key: string) => key.replace(/_([a-z])/g, g => g[1].toUpperCase());

export const toSnakeCase = convertCase(snakeCaseConverter);

export const toCamelCase = convertCase(camelCaseConverter);

export const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    } catch (error) {
        console.error("Failed to format date:", dateString, error);
        return dateString;
    }
};