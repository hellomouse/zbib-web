const getParentStyleName = styleXml => {
	const matches = styleXml.match(/<link.*?href="?(https?:\/\/[\w.\-/]*)"?.*?rel="?independent-parent"?.*?\/>/i);
	if(matches) {
		const idMatches = matches[1].match(/https?:\/\/www\.zotero\.org\/styles\/([\w-]*)/i);
		if(idMatches) {
			return idMatches[1];
		}
	}
	return null;
}

const isSentenceCaseStyle = (citationStyleName, citationStyleXmls = null) => {
	const isMatch = citationStyleName && (isUppercaseSubtitlesStyle(citationStyleName)
		|| !!citationStyleName.match(/^american-medical-association|cite-them-right|^vancouver/));

	return isMatch || (citationStyleXmls && isSentenceCaseStyle(getParentStyleName(citationStyleXmls[0])));
};

// Sentence-case styles that capitalize subtitles like APA
const isUppercaseSubtitlesStyle = (citationStyleName, citationStyleXmls = null) => {
	const isMatch = citationStyleName && (!!citationStyleName.match(/^apa($|-)|^academy-of-management($|-)|^(freshwater-science)/));

	return isMatch || (citationStyleXmls && isUppercaseSubtitlesStyle(getParentStyleName(citationStyleXmls[0])));
};

const isNoteStyle = cslDataXmls => !!cslDataXmls[cslDataXmls.length - 1].match(/citation-format="note.*?"/);
const isNumericStyle = cslDataXmls => !!cslDataXmls[cslDataXmls.length - 1].match(/citation-format="numeric.*?"/);

const useCitationStyle = (citationStyleName, citationStyleXml) =>  {
	return  {
		isNoteStyle: citationStyleXml ? isNoteStyle(citationStyleXml) : null,
		isNumericStyle: citationStyleXml ? isNumericStyle(citationStyleXml) : null,
		isSentenceCaseStyle: citationStyleXml ? isSentenceCaseStyle(citationStyleName, citationStyleXml) : null,
		isUppercaseSubtitlesStyle: citationStyleXml ? isUppercaseSubtitlesStyle(citationStyleName, citationStyleXml) : null,
	};
}

export { useCitationStyle };