/* eslint-disable react/no-multi-comp */

import React from 'react';
import classNames from 'classnames';
import {get} from 'lodash';

import {broadcast} from './fields';

import {ActionsMenu} from './index';
import {closeActionsMenu} from '../helpers';
import {ItemSwimlane} from './ItemSwimlane';
import {ItemPhotoGrid} from './ItemPhotoGrid';
import {ListItemTemplate} from './ItemListTemplate';
import {ItemMgridTemplate} from './ItemMgridTemplate';
import {IArticle} from 'superdesk-interfaces/Article';
import {IDesk} from 'superdesk-interfaces/Desk';

const actionsMenuDefaultTemplate = (toggle, stopEvent) => (
    <div className="item-right toolbox">
        <div className="item-actions-menu dropdown--big open">
            <button
                className={'more-activity-toggle condensed dropdown__toggle'}
                onClick={toggle}
                onDoubleClick={stopEvent}>
                <i className="icon-dots-vertical" />
            </button>
        </div>
    </div>
);

interface IProps {
    svc: any;
    scope: any;
    swimlane: any;
    item: IArticle;
    profilesById: any;
    highlightsById: any;
    markedDesksById: any;
    ingestProvider: any;
    versioncreator: any;
    onMultiSelect: any;
    desk: IDesk;
    flags: any;
    view: any;
    onDbClick: any;
    onEdit: any;
    onSelect: any;
    narrow: any;
    hideActions: boolean;
    multiSelectDisabled: boolean;
    nested: Array<IArticle>;
    isNested: boolean;
}

interface IState {
    hover: boolean;
    actioning: boolean;
    isActionMenuOpen: boolean;
    showNested: boolean;
}

export class Item extends React.Component<IProps, IState> {
    static propTypes: any;
    static defaultProps: any;

    readonly state = {hover: false, actioning: false, isActionMenuOpen: false, showNested: false};

    constructor(props) {
        super(props);

        this.select = this.select.bind(this);
        this.edit = this.edit.bind(this);
        this.dbClick = this.dbClick.bind(this);
        this.setActioningState = this.setActioningState.bind(this);
        this.setHoverState = this.setHoverState.bind(this);
        this.unsetHoverState = this.unsetHoverState.bind(this);
        this.onDragStart = this.onDragStart.bind(this);
        this.openAuthoringView = this.openAuthoringView.bind(this);
        this.toggleNested = this.toggleNested.bind(this);
    }

    componentWillMount() {
        if (get(this.props, 'svc.config.apps', []).includes('superdesk-planning')) {
            this.loadPlanningModals();
        }
    }

    componentWillUnmount() {
        closeActionsMenu(this.props.item._id);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.item !== this.props.item) {
            closeActionsMenu(this.props.item._id);
        }
    }

    loadPlanningModals() {
        const {session, superdesk, activityService} = this.props.svc;

        if (!['add_to_planning', 'fulfil_assignment'].includes(get(this.props, 'item.lock_action')) ||
                get(this.props, 'item.lock_user') !== session.identity._id ||
                get(this.props, 'item.lock_session') !== session.sessionId) {
            return;
        }

        let planningActivity;
        const activities = superdesk.findActivities({action: 'list', type: 'archive'},
            this.props.item);

        // Planning: if page probably was refreshed / loaded during the add-to-planning operation,
        // reload the add-to-planning modal
        if (this.props.item.lock_action === 'add_to_planning') {
            planningActivity = activities.find((a) => a._id === 'planning.addto');
        } else if (this.props.item.lock_action === 'fulfil_assignment') {
            planningActivity = activities.find((a) => a._id === 'planning.fulfil');
        }

        if (planningActivity) {
            this.setActioningState(true);
            activityService.start(planningActivity, {data: {item: this.props.item}})
                .finally(() => this.setActioningState(false));
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextProps.swimlane !== this.props.swimlane || nextProps.item !== this.props.item ||
            nextProps.view !== this.props.view ||
            nextProps.flags.selected !== this.props.flags.selected ||
            nextProps.narrow !== this.props.narrow ||
            nextState !== this.state;
    }

    select(event) {
        if (!this.props.item.gone) {
            this.props.onSelect(this.props.item, event);
        }
    }

    /**
     * Opens the item in authoring in view mode
     * @param {string} itemId Id of the document
     */
    openAuthoringView(itemId) {
        const {authoringWorkspace} = this.props.svc;

        authoringWorkspace.edit({_id: itemId}, 'view');
    }

    edit(event) {
        if (!this.props.item.gone) {
            this.props.onEdit(this.props.item);
        }
    }

    dbClick(event) {
        if (!this.props.item.gone) {
            this.props.onDbClick(this.props.item);
        }
    }

    /**
     * Set Actioning state
     * @param {Boolean} isActioning - true if activity is in-progress, and false if completed
     */
    setActioningState(isActioning) {
        this.setState({actioning: isActioning});
    }

    setHoverState() {
        this.setState({hover: true});
    }

    unsetHoverState() {
        this.setState({hover: false});
    }

    onDragStart(event) {
        const {dragitem} = this.props.svc;

        dragitem.start(event, this.props.item);
    }

    toggleNested(event) {
        event.stopPropagation();
        this.setState({showNested: !this.state.showNested});
    }

    render() {
        const {item, scope} = this.props;
        let classes = this.props.view === 'photogrid' ?
            'sd-grid-item sd-grid-item--with-click' :
            'media-box media-' + item.type;

        // Customize item class from its props
        if (scope.customRender && typeof scope.customRender.getItemClass === 'function') {
            classes = `${classes} ${scope.customRender.getItemClass(item)}`;
        }

        const isLocked: boolean = (item.lock_user && item.lock_session) != null;

        const getActionsMenu = (template = actionsMenuDefaultTemplate) =>
            this.props.hideActions !== true && this.state.hover && !item.gone ? React.createElement(
                ActionsMenu, {
                    item: item,
                    svc: this.props.svc,
                    scope: this.props.scope,
                    onActioning: this.setActioningState,
                    template: template,
                }) : null;

        const getTemplate = () => {
            switch (this.props.view) {
            case 'swimlane2':
                return (
                    <ItemSwimlane
                        item={item}
                        isLocked={isLocked}
                        getActionsMenu={getActionsMenu}
                        onMultiSelect={this.props.onMultiSelect}
                        svc={this.props.svc}
                    />
                );
            case 'mgrid':
                return (
                    <ItemMgridTemplate
                        item={item}
                        desk={this.props.desk}
                        swimlane={this.props.swimlane}
                        svc={this.props.svc}
                        ingestProvider={this.props.ingestProvider}
                        onMultiSelect={this.props.onMultiSelect}
                        broadcast={broadcast}
                        getActionsMenu={getActionsMenu}
                    />
                );
            case 'photogrid':
                return (
                    <ItemPhotoGrid
                        item={item}
                        desk={this.props.desk}
                        ingestProvider={this.props.ingestProvider}
                        svc={this.props.svc}
                        swimlane={this.props.swimlane}
                        onMultiSelect={this.props.onMultiSelect}
                        getActionsMenu={getActionsMenu}
                    />
                );
            default:
                return (
                    <ListItemTemplate
                        item={item}
                        desk={this.props.desk}
                        svc={this.props.svc}
                        openAuthoringView={this.openAuthoringView}
                        ingestProvider={this.props.ingestProvider}
                        highlightsById={this.props.highlightsById}
                        markedDesksById={this.props.markedDesksById}
                        profilesById={this.props.profilesById}
                        swimlane={this.props.swimlane}
                        versioncreator={this.props.versioncreator}
                        narrow={this.props.narrow}
                        onMultiSelect={this.props.onMultiSelect}
                        getActionsMenu={getActionsMenu}
                        scope={this.props.scope}
                        selectingDisabled={this.props.multiSelectDisabled}
                        showNested={this.state.showNested}
                        nestedCount={this.props.nested.length}
                        toggleNested={this.toggleNested}
                    />
                );
            }
        };

        const getNested = () => {
            switch (this.props.view) {
            case 'swimlane2':
            case 'mgrid':
            case 'photogrid':
                return null;
            default:
                if (!this.props.nested.length || !this.state.showNested) {
                    return null;
                }

                return (
                    <div className="sd-list-item-nested__childs sd-shadow--z1">
                        {this.props.nested.map((childItem) => (
                            <Item
                                item={childItem}
                                key={childItem._id + childItem._current_version}
                                svc={this.props.svc}
                                scope={this.props.scope}
                                flags={{}}
                                nested={[]}
                                profilesById={this.props.profilesById}
                                isNested={true}
                                narrow={true}
                                hideActions={true}
                                onSelect={() => null}
                                multiSelectDisabled={false}
                                swimlane={this.props.swimlane}
                                highlightsById={this.props.highlightsById}
                                markedDesksById={this.props.markedDesksById}
                                ingestProvider={this.props.ingestProvider}
                                desk={this.props.desk}
                                view={this.props.view}
                                versioncreator={this.props.versioncreator}
                                onEdit={this.props.onEdit}
                                onDbClick={this.props.onDbClick}
                                onMultiSelect={this.props.onMultiSelect}
                            />
                        ))}
                    </div>
                );
            }
        };

        // avoid any actions on nested items
        const getCallback = (func) => this.props.isNested ? (event) => event.stopPropagation() : func;

        return React.createElement(
            this.props.isNested ? 'div' : 'li',
            {
                id: item._id,
                key: item._id,
                className: classNames(
                    'list-item-view',
                    {
                        'actions-visible': this.props.hideActions !== true,
                        active: this.props.flags.selected,
                        selected: this.props.item.selected && !this.props.flags.selected,
                        'sd-list-item-nested': this.props.nested.length,
                        'sd-list-item-nested--expanded': this.props.nested.length && this.state.showNested,
                        'sd-list-item-nested--collapsed': this.props.nested.length && this.state.showNested === false,
                    },
                ),
                onMouseEnter: getCallback(this.setHoverState),
                onMouseLeave: getCallback(this.unsetHoverState),
                onDragStart: getCallback(this.onDragStart),
                onClick: getCallback(this.select),
                onDoubleClick: getCallback(this.dbClick),
                draggable: !this.props.isNested,
            },
            (
                <div className={classNames(classes, {
                    active: this.props.flags.selected,
                    locked: isLocked,
                    selected: this.props.item.selected || this.props.flags.selected,
                    archived: item.archived || item.created,
                    gone: item.gone,
                    actioning: this.state.actioning,
                })}>
                    {getTemplate()}
                </div>
            ),
            getNested(),
        );
    }
}
