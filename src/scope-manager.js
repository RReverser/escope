/*
  Copyright (C) 2015 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

import WeakMap from 'es6-weak-map';
import Scope from './scope';

/**
 * @class ScopeManager
 */
export default class ScopeManager {
    constructor(options) {
        this.scopes = [];
        this.globalScope = null;
        this.__nodeToScope = new WeakMap();
        this.__currentScope = null;
        this.__options = options;
    }

    __useDirective() {
        return this.__options.directive;
    }

    __isOptimistic() {
        return this.__options.optimistic;
    }

    __ignoreEval() {
        return this.__options.ignoreEval;
    }

    isModule() {
        return this.__options.sourceType === 'module';
    }

    // Returns appropliate scope for this node.
    __get(node) {
        return this.__nodeToScope.get(node);
    }

    /**
     * acquire scope from node.
     * @method ScopeManager#acquire
     * @param {Esprima.Node} node - node for the acquired scope.
     * @param {boolean=} inner - look up the most inner scope, default value is false.
     * @return {Scope?}
     */
    acquire(node, inner) {
        var scopes, scope, i, iz;

        function predicate(scope) {
            if (scope.type === 'function' && scope.functionExpressionScope) {
                return false;
            }
            if (scope.type === 'TDZ') {
                return false;
            }
            return true;
        }

        scopes = this.__get(node);
        if (!scopes || scopes.length === 0) {
            return null;
        }

        // Heuristic selection from all scopes.
        // If you would like to get all scopes, please use ScopeManager#acquireAll.
        if (scopes.length === 1) {
            return scopes[0];
        }

        if (inner) {
            for (i = scopes.length - 1; i >= 0; --i) {
                scope = scopes[i];
                if (predicate(scope)) {
                    return scope;
                }
            }
        } else {
            for (i = 0, iz = scopes.length; i < iz; ++i) {
                scope = scopes[i];
                if (predicate(scope)) {
                    return scope;
                }
            }
        }

        return null;
    }

    /**
     * acquire all scopes from node.
     * @method ScopeManager#acquireAll
     * @param {Esprima.Node} node - node for the acquired scope.
     * @return {Scope[]?}
     */
    acquireAll(node) {
        return this.__get(node);
    }

    /**
     * release the node.
     * @method ScopeManager#release
     * @param {Esprima.Node} node - releasing node.
     * @param {boolean=} inner - look up the most inner scope, default value is false.
     * @return {Scope?} upper scope for the node.
     */
    release(node, inner) {
        var scopes, scope;
        scopes = this.__get(node);
        if (scopes && scopes.length) {
            scope = scopes[0].upper;
            if (!scope) {
                return null;
            }
            return this.acquire(scope.block, inner);
        }
        return null;
    }

    attach() { }

    detach() { }

    __nestScope(node, isMethodDefinition) {
        return new Scope(this, node, isMethodDefinition, Scope.SCOPE_NORMAL);
    }

    __nestModuleScope(node) {
        return new Scope(this, node, false, Scope.SCOPE_MODULE);
    }

    __nestTDZScope(node) {
        return new Scope(this, node, false, Scope.SCOPE_TDZ);
    }

    __nestFunctionExpressionNameScope(node, isMethodDefinition) {
        return new Scope(this, node, isMethodDefinition, Scope.SCOPE_FUNCTION_EXPRESSION_NAME);
    }

    __isES6() {
        return this.__options.ecmaVersion >= 6;
    }
}

/* vim: set sw=4 ts=4 et tw=80 : */
