/// utils
export type TransformationsOfB<RawType, ProcessedValue> = {
	[K in keyof ProcessedValue]: (a: RawType) => ProcessedValue[K];
};

export const transformRawToProcessed = <RawType, ProcessedValue>(
	rawValue: RawType,
	transformationsOfB: TransformationsOfB<RawType, ProcessedValue>,
): ProcessedValue => {
	const keysOfB = Object.keys(transformationsOfB) as Array<
		keyof ProcessedValue
	>;
	const keyTransformedValuePair = keysOfB.map((keyOfB) => [
		keyOfB,
		transformationsOfB[keyOfB](rawValue),
	]);
	const result: ProcessedValue = Object.fromEntries(keyTransformedValuePair);
	return result;
};
