/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {ActionService} from '../../src/service/action-impl';
import * as sinon from 'sinon';


describe('ActionService parseAction', () => {

  let sandbox;
  let action;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    action = new ActionService(window);
  });

  afterEach(() => {
    action = null;
    sandbox.restore();
    sandbox = null;
  });


  it('should fail parse without event', () => {
    const a = action.parseAction_('target1.method1');
    expect(a).to.equal(null);
  });

  it('should parse with default method', () => {
    const a = action.parseAction_('event1:target1');
    expect(a.event).to.equal('event1');
    expect(a.target).to.equal('target1');
    expect(a.method).to.equal('activate');
  });

  it('should parse full form', () => {
    const a = action.parseAction_('event1:target1.method1');
    expect(a.event).to.equal('event1');
    expect(a.target).to.equal('target1');
    expect(a.method).to.equal('method1');
  });

  it('should parse with lots of whitespace', () => {
    const a = action.parseAction_('  event1  :  target1  .  method1  ');
    expect(a.event).to.equal('event1');
    expect(a.target).to.equal('target1');
    expect(a.method).to.equal('method1');
  });

  it('should parse empty to null', () => {
    const a = action.parseAction_('');
    expect(a).to.equal(null);
  });

  it('should parse without target to null', () => {
    expect(action.parseAction_('event1:')).to.equal(null);
    expect(action.parseAction_('.method1')).to.equal(null);
    expect(action.parseAction_('event1:.method1')).to.equal(null);
  });

  it('should parse with period in event or method', () => {
    const a = action.parseAction_('event.1:target1.method.1');
    expect(a.event).to.equal('event.1');
    expect(a.target).to.equal('target1');
    expect(a.method).to.equal('method.1');
  });
});


describe('Action parseActionMap', () => {

  let sandbox;
  let action;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    action = new ActionService(window);
  });

  afterEach(() => {
    action = null;
    sandbox.restore();
    sandbox = null;
  });

  it('should parse with a single action', () => {
    const m = action.parseActionMap_('event1:action1');
    expect(m['event1'].target).to.equal('action1');
  });

  it('should parse with two actions', () => {
    const m = action.parseActionMap_('event1:action1; event2: action2');
    expect(m['event1'].target).to.equal('action1');
    expect(m['event2'].target).to.equal('action2');
  });

  it('should parse with dupe actions by overriding with last', () => {
    const m = action.parseActionMap_('event1:action1; event1: action2');
    // Currently, we overwrite the events.
    expect(m['event1'].target).to.equal('action2');
  });

  it('should parse empty forms to null', () => {
    expect(action.parseActionMap_('')).to.equal(null);
    expect(action.parseActionMap_('  ')).to.equal(null);
    expect(action.parseActionMap_(';;;')).to.equal(null);
  });
});


describe('Action findAction', () => {

  let sandbox;
  let action;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    action = new ActionService(window);
  });

  afterEach(() => {
    action = null;
    sandbox.restore();
    sandbox = null;
  });

  it('should create action map in getActionMap_', () => {
    const element = document.createElement('div');
    element.setAttribute('on', 'event1:action1');
    const m = action.getActionMap_(element);
    expect(m['event1'].target).to.equal('action1');
  });

  it('should cache action map', () => {
    const element = document.createElement('div');
    element.setAttribute('on', 'event1:action1');
    const m1 = action.getActionMap_(element);
    const m2 = action.getActionMap_(element);
    expect(m1).to.equal(m2);
  });


  it('should find action on the same element', () => {
    const element = document.createElement('div');
    element.setAttribute('on', 'event1:action1');
    const a = action.findAction_(element, 'event1');
    expect(a.node).to.equal(element);
    expect(a.actionInfo.target).to.equal('action1');

    expect(action.findAction_(element, 'event3')).to.equal(null);
  });

  it('should find action in subtree', () => {
    const parent = document.createElement('div');
    parent.setAttribute('on', 'event1:action1');
    const element = document.createElement('div');
    element.setAttribute('on', 'event2:action2');
    parent.appendChild(element);

    let a = action.findAction_(element, 'event1');
    expect(a.node).to.equal(parent);
    expect(a.actionInfo.target).to.equal('action1');

    a = action.findAction_(element, 'event2');
    expect(a.node).to.equal(element);
    expect(a.actionInfo.target).to.equal('action2');

    expect(action.findAction_(element, 'event3')).to.equal(null);
  });
});


describe('Action method', () => {

  let sandbox;
  let action;
  let onEnqueue;
  let targetElement, parent, child, execElement;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    action = new ActionService(window);
    onEnqueue = sinon.spy();
    targetElement = document.createElement('target');
    const id = ('E' + Math.random()).replace('.', '');
    targetElement.setAttribute('on', 'tap:' + id + '.method1');
    parent = document.createElement('parent');
    child = document.createElement('child');
    parent.appendChild(targetElement);
    targetElement.appendChild(child);
    document.body.appendChild(parent);

    execElement = document.createElement('amp-element');
    execElement.setAttribute('id', id);
    execElement.enqueAction = onEnqueue;
    parent.appendChild(execElement);
  });

  afterEach(() => {
    document.body.removeChild(parent);
    action = null;
    sandbox.restore();
    sandbox = null;
  });


  it('should invoke on the AMP element', () => {
    action.invoke_(execElement, 'method1', 'source1', 'event1');
    expect(onEnqueue.callCount).to.equal(1);
    const inv = onEnqueue.getCall(0).args[0];
    expect(inv.target).to.equal(execElement);
    expect(inv.method).to.equal('method1');
    expect(inv.source).to.equal('source1');
    expect(inv.event).to.equal('event1');
  });

  it('should not allow invoke on non-AMP element', () => {
    expect(() => {
      action.invoke_({tagName: 'img'}, 'method1', 'source1', 'event1');
    }).to.throw(/Target must be an AMP element/);
    expect(onEnqueue.callCount).to.equal(0);
  });

  it('should not allow invoke on unresolved AMP element', () => {
    expect(() => {
      action.invoke_({tagName: 'amp-img'}, 'method1', 'source1', 'event1');
    }).to.throw(/Unrecognized AMP element/);
    expect(onEnqueue.callCount).to.equal(0);
  });

  it('should trigger event', () => {
    action.trigger(child, 'tap', null);
    expect(onEnqueue.callCount).to.equal(1);
    const inv = onEnqueue.getCall(0).args[0];
    expect(inv.target).to.equal(execElement);
    expect(inv.method).to.equal('method1');
    expect(inv.source).to.equal(targetElement);
  });

  it('should execute method', () => {
    action.execute(execElement, 'method1', child, null);
    expect(onEnqueue.callCount).to.equal(1);
    const inv = onEnqueue.getCall(0).args[0];
    expect(inv.target).to.equal(execElement);
    expect(inv.method).to.equal('method1');
    expect(inv.source).to.equal(child);
  });
});


describe('Action interceptor', () => {

  let sandbox;
  let clock;
  let action;
  let target;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    clock = sandbox.useFakeTimers();
    action = new ActionService(window);
    target = document.createElement('target');
    target.setAttribute('id', 'amp-test-1');
  });

  afterEach(() => {
    action = null;
    clock = null;
    sandbox.restore();
    sandbox = null;
  });

  function getQueue() {
    return target['__AMP_ACTION_QUEUE__'];
  }


  it('should not initialize until called', () => {
    expect(getQueue()).to.be.undefined;
  });

  it('should queue actions', () => {
    action.invoke_(target, 'method1', 'source1', 'event1');
    action.invoke_(target, 'method2', 'source2', 'event2');

    const queue = getQueue();
    expect(Array.isArray(queue)).to.be.true;
    expect(queue).to.have.length(2);

    const inv0 = queue[0];
    expect(inv0.target).to.equal(target);
    expect(inv0.method).to.equal('method1');
    expect(inv0.source).to.equal('source1');
    expect(inv0.event).to.equal('event1');

    const inv1 = queue[1];
    expect(inv1.target).to.equal(target);
    expect(inv1.method).to.equal('method2');
    expect(inv1.source).to.equal('source2');
    expect(inv1.event).to.equal('event2');
  });

  it('should dequeue actions after handler set', () => {
    action.invoke_(target, 'method1', 'source1', 'event1');
    action.invoke_(target, 'method2', 'source2', 'event2');

    expect(Array.isArray(getQueue())).to.be.true;
    expect(getQueue()).to.have.length(2);

    const handler = sinon.spy();
    action.installActionHandler(target, handler);
    expect(Array.isArray(getQueue())).to.be.false;
    expect(handler.callCount).to.equal(0);

    clock.tick(10);
    expect(handler.callCount).to.equal(2);

    const inv0 = handler.getCall(0).args[0];
    expect(inv0.target).to.equal(target);
    expect(inv0.method).to.equal('method1');
    expect(inv0.source).to.equal('source1');
    expect(inv0.event).to.equal('event1');

    const inv1 = handler.getCall(1).args[0];
    expect(inv1.target).to.equal(target);
    expect(inv1.method).to.equal('method2');
    expect(inv1.source).to.equal('source2');
    expect(inv1.event).to.equal('event2');

    action.invoke_(target, 'method3', 'source3', 'event3');
    expect(Array.isArray(getQueue())).to.be.false;
    expect(handler.callCount).to.equal(3);
    const inv2 = handler.getCall(2).args[0];
    expect(inv2.target).to.equal(target);
    expect(inv2.method).to.equal('method3');
    expect(inv2.source).to.equal('source3');
    expect(inv2.event).to.equal('event3');
  });
});


describe('Action common handler', () => {

  let sandbox;
  let action;
  let target;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    action = new ActionService(window);
    target = document.createElement('target');
    target.setAttribute('id', 'amp-test-1');

    action.vsync_ = {mutate: callback => callback()};
  });

  afterEach(() => {
    action = null;
    sandbox.restore();
    sandbox = null;
  });

  it('should execute actions registered', () => {
    const action1 = sandbox.spy();
    const action2 = sandbox.spy();
    action.addGlobalMethodHandler('action1', action1);
    action.addGlobalMethodHandler('action2', action2);

    action.invoke_(target, 'action1', 'source1', 'event1');
    expect(action1.callCount).to.equal(1);
    expect(action2.callCount).to.equal(0);

    action.invoke_(target, 'action2', 'source2', 'event2');
    expect(action2.callCount).to.equal(1);
    expect(action1.callCount).to.equal(1);

    expect(target['__AMP_ACTION_QUEUE__']).to.not.exist;
  });
});
