'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import deepEqual from 'deep-equal';
import { splice } from '../../utils';
import CreatorField from './creator-field';

class Creators extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			isCreatorTypeEditing: false,
			creators: props.value.length ? [...props.value] : [this.newCreator]
		};
		this.fields = {};
	}

	componentWillReceiveProps(props) {
		let creators = this.state.creators;
		if(!deepEqual(this.props.value, props.value)) {
			creators = props.value.length ? props.value : [this.newCreator];
		}
		if(!deepEqual(this.props.creatorTypes, props.creatorTypes)) {
			const validCreatorTypes = props.creatorTypes.map(ct => ct.value);
			creators = creators.map(creator => ({
					...creator,
					creatorType: validCreatorTypes.includes(creator.creatorType) ? creator.creatorType : validCreatorTypes[0]
				}));
		}
		this.setState({ creators });
	}

	componentDidUpdate(props, state) {
		if(this.state.creators.length > state.creators.length &&
			this.state.creators[this.state.creators.length - 1][Symbol.for('isVirtual')]) {
			this.fields[this.state.creators.length - 1].focus();
		}
	}

	handleSaveCreators(creators) {
		this.setState({ creators });
		const newValue = creators.filter(
			creator => !creator[Symbol.for('isVirtual')]
				&& (creator.lastName || creator.firstName || creator.name)
		);
		const hasChanged = !deepEqual(newValue, this.props.value);
		this.props.onSave(newValue, hasChanged);
	}

	handleValueChanged(index, key, value) {
		const creators = [...this.state.creators];
		creators[index] = {
			...creators[index],
			[key]: value
		};
		if((creators[index].lastName || creators[index].firstName || creators[index].name)
			&& creators[index][Symbol.for('isVirtual')]) {
			delete creators[index][Symbol.for('isVirtual')];
		}
		this.handleSaveCreators(creators);
	}

	handleCreatorAdd() {
		const creators = [...this.state.creators];
		creators.push(this.newCreator);
		this.setState({ creators });
	}

	handleCreatorRemove(index) {
		if(this.state.creators.length > 1) {
			this.handleSaveCreators(splice(this.state.creators, index, 1));
		} else {
			this.handleSaveCreators([this.newCreator]);
		}
	}

	handleCreatorTypeSwitch(index) {
		const creators = [...this.state.creators];

		if('name' in creators[index]) {
			let creator = creators[index].name.split(' ');
			creators[index] = {
				lastName: creator.length > 0 ? creator[creator.length - 1] : '',
				firstName: creator.slice(0, creator.length - 1).join(' '),
				creatorType: creators[index].creatorType,
				[Symbol.for('isVirtual')]: creators[index][Symbol.for('isVirtual')]
			};
		} else if('lastName' in creators[index]) {
			creators[index] = {
				name: `${creators[index].firstName} ${creators[index].lastName}`.trim(),
				creatorType: creators[index].creatorType,
				[Symbol.for('isVirtual')]: creators[index][Symbol.for('isVirtual')]
			};
		}

		this.handleSaveCreators(creators);
	}

	get newCreator() {
		return {
			creatorType: this.props.creatorTypes[0].value,
			firstName: '',
			lastName: '',
			[Symbol.for('isVirtual')]: true
		};
	}

	get hasVirtual() {
		return !!this.state.creators.find(creator => creator[Symbol.for('isVirtual')]);
	}

	renderField(creator, index) {
		const isVirtual = creator[Symbol.for('isVirtual')] || false;
		const props = {
			creator,
			creatorTypes: this.props.creatorTypes,
			index,
			isCreateAllowed: index + 1 === this.state.creators.length && !this.hasVirtual,
			isCreatorTypeEditing: this.state.isCreatorTypeEditing,
			isDeleteAllowed: !isVirtual || this.state.creators.length > 1,
			isForm: this.props.isForm,
			isVirtual,
			onChange: this.handleValueChanged.bind(this),
			onCreatorAdd: this.handleCreatorAdd.bind(this),
			onCreatorRemove: this.handleCreatorRemove.bind(this),
			onCreatorTypeSwitch: this.handleCreatorTypeSwitch.bind(this),
			ref: ref => this.fields[index] = ref
		};
		return <CreatorField key={ index } { ...props } />;
	}

	render() {
		let creators = this.state.creators;

		return (
			<React.Fragment>
				{ creators.map(this.renderField.bind(this)) }
			</React.Fragment>
		);
	}
	static defaultProps = {
		value: []
	};

	static propTypes = {
		creatorTypes: PropTypes.array.isRequired,
		isForm: PropTypes.bool,
		name: PropTypes.string,
		onSave: PropTypes.func,
		value: PropTypes.array,
	};
}

export default Creators;
