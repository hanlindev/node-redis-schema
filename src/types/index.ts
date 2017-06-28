import {String} from './String';
import {List} from './List';
import {Hash, IIndexable} from './Hash';
import {RSet} from './Set';
import {Shape} from './Shape';
import {Number} from './Number';
import {ListOf} from './ListOf';
import {IRedisComposeType, IRedisType} from './interfaces';

export * from './interfaces';
export * from './BaseType';
export * from './BaseModel';

export const Types = {
  string: String.getFactory,
  number: Number.getFactory,
  list: List.getFactory,
  hash: Hash.getFactory,
  set: RSet.getFactory,
  shape: Shape.getFactory,
  listOf: ListOf.getFactory,
}