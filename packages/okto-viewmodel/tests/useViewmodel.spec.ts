import expect = require("expect.js");
import * as sinon from "sinon";
import * as React from "react";
import { isNumber, isFunction } from "lodash";
import { IMock, Mock, It, Times } from "typemoq";

import { useContainer as UseContainer } from "@okto/core";
import { SimpleViewModel } from "./fixtures/SimpleViewModel";
import { IViewModelFactory } from "../src/registry/IViewModelFactory";
import { UseViewmodelFactory, useViewmodel } from "../src/hooks/useViewmodel";

describe("The useViewmodel hook", () => {
  let subject: typeof useViewmodel;

  let factory: IMock<IViewModelFactory>;
  let useContainer: typeof UseContainer;
  let useState: typeof React.useState;
  let useEffect: typeof React.useEffect;

  let viewmodel: SimpleViewModel;
  let updateView: sinon.SinonSpy;
  let updateViewmodel: sinon.SinonSpy;

  let useEffectCallback: React.EffectCallback;

  beforeEach(() => {
    viewmodel = new SimpleViewModel();

    updateView = sinon.fake();
    updateViewmodel = sinon.fake();

    factory = Mock.ofType<IViewModelFactory>();
    factory.setup(f => f.createFrom(It.isValue(SimpleViewModel), It.isAny())).returns(() => viewmodel);

    useContainer = () => factory.object as any;

    useState = sinon.fake((state?: any) => {
      if (isNumber(state)) return [state, updateView];
      return [viewmodel, updateViewmodel];
    });

    useEffect = (effect) => useEffectCallback = effect;

    subject = UseViewmodelFactory(useContainer, useState, useEffect);
  });

  context("when is used in a component", () => {
    beforeEach(() => {
      subject(SimpleViewModel);
    });
    context(("and it is mount"), () => {
      let disposeCallback: void | (() => void);
      beforeEach(() => {
        disposeCallback = useEffectCallback();
      });

      it("should retrieve the viewmodel", () => {
        factory.verify(f => f.createFrom(It.isValue(SimpleViewModel), It.isAny()), Times.once());
        expect(updateViewmodel.callCount).to.be(1);
        expect(updateViewmodel.lastCall.args[0]).to.be(viewmodel);
      });

      it("should subscribe the component to the viewmodel updates", () => {
        viewmodel.increase();
        viewmodel.increase();
        expect(updateView.callCount).to.be(2);

        viewmodel.decrease();
        expect(updateView.callCount).to.be(2);
      });

      context("when is going to unmount", () => {
        beforeEach(() => {
          if (isFunction(disposeCallback)) disposeCallback();
        });
        it("should unsubscribe the component", () => {
          viewmodel.increase();
          expect(updateView.callCount).to.be(0);

        });
        it("should dispose the viewmodel", () => {
          expect(viewmodel.isDisposed).to.be.ok();
        });
      });
    });
  });
});
