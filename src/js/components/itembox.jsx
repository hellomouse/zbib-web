'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import Creators from './form/creators';
import Editable from './ui/editable';
import Field from './form/field';
import Input from './form/input';
import SelectInput from './form/select';
import Spinner from './ui/spinner';
import TextAreaInput from './form/text-area';

const pickInputComponent = field => {
	switch(field.key) {
		case 'itemType': return SelectInput;
		case 'abstractNote': return TextAreaInput;
		case 'extra': return TextAreaInput;
		default: return Input;
	}
};

class ItemBox extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			activeEntry: null,
		};
		this.fieldComponents = {};
	}

	focusField(name = 'itemType') {
		if(name in this.fieldComponents) {
			this.fieldComponents[name].focus();
			return true;
		} else {
			return false;
		}
	}

	handleCancel(key) {
		if(key === this.state.activeEntry) {
			this.setState({ activeEntry: null });
		}
	}

	handleEditableCommit(key, newValue, isChanged, srcEvent) {
		if(isChanged) {
			this.props.onSave(key, newValue);
		}
		if(key === this.state.activeEntry) {
			this.setState({ activeEntry: null });
		}
		if(this.props.isForm && srcEvent) {
			if(srcEvent.type == 'keydown' && srcEvent.key == 'Enter') {
				srcEvent.target.blur();
			}
		}
	}

	renderCreators(field) {
		return (
			<Creators
				key={ field.key }
				name={ field.key }
				creatorTypes = { this.props.creatorTypes }
				value={ field.value || [] }
				onSave={ this.handleEditableCommit.bind(this, field.key) }
				isForm={ this.props.isForm }
			/>
		);
	}

	renderLabelContent(field) {
		switch(field.key) {
			case 'url':
				return (
					<a rel='nofollow' href={ field.value }>
						{ field.label }
					</a>
				);
			case 'DOI':
				return (
					<a rel='nofollow' href={ 'http://dx.doi.org/' + field.value }>
						{ field.label }
					</a>
				);
			default:
				return field.label;
		}
	}

	renderField(field) {
		if(field.key === 'creators') {
			return this.renderCreators(field);
		} else {
			const isActive = this.state.activeEntry === field.key;
			const className = {
				'empty': !field.value || !field.value.length,
				'select': field.options && Array.isArray(field.options),
				'editing': isActive,
				'abstract': field.key === 'abstractNote',
				'extra': field.key === 'extra',
			};
			const display = field.key === 'itemType' ?
				field.options.find(o => o.value === field.value) :
				null;
			const props = {
				autoFocus: !this.props.isForm,
				display: display ? display.label : null,
				inputComponent: pickInputComponent(field),
				isActive,
				isBusy: field.processing || false,
				onCancel: this.handleCancel.bind(this, field.key),
				onCommit: this.handleEditableCommit.bind(this, field.key),
				options: field.options || null,
				selectOnFocus: !this.props.isForm,
				value: field.value || '',
				className: 'form-control form-control-sm',
				id: field.key,
				[this.props.isForm ? 'ref' : 'inputRef']: component => this.fieldComponents[field.key] = component,
			};

			if(this.props.isForm) {
				props['tabIndex'] = 0;
			}

			if(props.inputComponent === SelectInput) {
				props['onChange'] = () => true; //commit on change
			}

			if(props.inputComponent !== SelectInput) {
				props['onBlur'] = () => false; //commit on blur
			}
			if(props.inputComponent === TextAreaInput) {
				props['rows'] = 5;
			}

			const FormField = this.props.isForm ? props.inputComponent : Editable;

			return (
				<Field
					className={ cx(className) }
					isActive={ isActive }
					key={ field.key }
				>
					<label htmlFor={ field.key} >
						{ this.renderLabelContent(field) }
					</label>
					<FormField { ...props } />
				</Field>
			);
		}
	}

	render() {
		if(this.props.isLoading) {
			return <Spinner />;
		}

		return (
			<ol className={cx('metadata-list', 'horizontal', { editing: this.props.isEditing }) }>
				{ this.props.fields.map(this.renderField.bind(this)) }
			</ol>
		);
	}
}

ItemBox.defaultProps = {
	fields: [],
	onSave: v => Promise.resolve(v)
};

ItemBox.propTypes = {
	creatorTypes: PropTypes.array,
	fields: PropTypes.array,
	isEditing: PropTypes.bool, // relevant on small screens only
	isForm: PropTypes.bool,
	isLoading: PropTypes.bool,
	onSave: PropTypes.func
};

export default ItemBox;
