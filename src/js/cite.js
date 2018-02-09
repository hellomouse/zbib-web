const formatBib = (bib) => {
	var output = [
		bib[0].bibstart,
		...bib[1],
		bib[0].bibend
	];

	var maxOffset = parseInt(bib[0].maxoffset, 10);
	var entrySpacing = parseInt(bib[0].entryspacing, 10);
	var lineSpacing = parseInt(bib[0].linespacing, 10);
	var hangingIndent = parseInt(bib[0].hangingindent, 10);
	var secondFieldAlign = bib[0]['second-field-align'];

	// Validate input
	if(Number.isNaN(maxOffset)) {
		throw 'Invalid maxoffset';
	}
	if(Number.isNaN(entrySpacing)) {
		throw 'Invalid entryspacing';
	}
	if(Number.isNaN(lineSpacing)) {
		throw 'Invalid linespacing';
	}

	const container = document.createElement('div');
	container.innerHTML = output.join('');
	const div = container.firstChild;
	const leftMarginDivs = container.querySelectorAll('.csl-left-margin');
	const rightInlineDivs = container.querySelectorAll('.csl-right-inline');
	const indentDivs = container.querySelectorAll('.csl-indent');
	const isMultiField = !!leftMarginDivs.length;
	// Padding on the label column, which we need to include when
	// calculating offset of right column
	const rightPadding = .5;

	// One of the characters is usually a period, so we can adjust this down a bit
	maxOffset = Math.max(1, maxOffset - 2);

	// Force a minimum line height
	if(lineSpacing <= 1.35) {
		lineSpacing = 1.35;
	}

	var style = div.getAttribute('style') || '';
	style += 'line-height: ' + lineSpacing + '; ';

	if(hangingIndent) {
		if (isMultiField && !secondFieldAlign) {
			throw ('second-field-align=false and hangingindent=true combination is not currently supported');
		}
		// If only one field, apply hanging indent on root
		else if (!isMultiField) {
			style += 'margin-left: ' + hangingIndent + 'em; text-indent:-' + hangingIndent + 'em;';
		}
	}

	if(style) {
		div.setAttribute('style', style);
	}

	// csl-entry
	const cslEntries = container.querySelectorAll('.csl-entry');
	for(var i=0, n=cslEntries.length; i<n; i++) {
		const cslEntry = cslEntries[i];
		let divStyle = cslEntry.getAttribute('style') || '';

		if(isMultiField) {
			divStyle += 'clear: left; ';
		}

		if(entrySpacing && i !== n - 1) {
			divStyle += 'margin-bottom: ' + entrySpacing + 'em;';
		}

		if(divStyle) {
			div.setAttribute('style', divStyle);
		}
	}

	// div.csl-left-margin
	for (let div of leftMarginDivs) {
		let divStyle = div.getAttribute('style') || '';

		divStyle = 'float: left; padding-right: ' + rightPadding + 'em;';

		// Right-align the labels if aligning second line, since it looks
		// better and we don't need the second line of text to align with
		// the left edge of the label
		if (secondFieldAlign) {
			divStyle += 'text-align: right; width: ' + maxOffset + 'em;';
		}

		div.setAttribute('style', divStyle);
	}

	// div.csl-right-inline
	for (let div of rightInlineDivs) {
		let divStyle = div.getAttribute('style') || '';
		divStyle = 'margin: 0 .4em 0 ' + (secondFieldAlign ? maxOffset + rightPadding : '0') + 'em;';

		if (hangingIndent) {
			divStyle += 'padding-left: ' + hangingIndent + 'em; text-indent:-' + hangingIndent + 'em;';
		}

		div.setAttribute('style', divStyle);
	}

	// div.csl-indent
	for (let div of indentDivs) {
		div.setAttribute('style', 'margin: .5em 0 0 2em; padding: 0 0 .2em .5em; border-left: 5px solid #ccc;');
	}

	return container.innerHTML;
};

module.exports = formatBib;
