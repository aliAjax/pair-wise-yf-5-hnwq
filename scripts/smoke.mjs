import assert from 'node:assert';
import { reducer } from '../src/store.jsx';

let s = { ferries: [], queue: [], records: [] };
const dispatch = (a) => { s = reducer(s, a); return s; };
const veh = (plate, weight, vehType = 'car', cabin = 'vehicle') =>
  ({ type: 'ENQUEUE', plate, weight, vehType, cabin });

// 登记两艘渡轮
dispatch({ type: 'REGISTER_FERRY', name: '夜航一号', capacity: 10 });
dispatch({ type: 'REGISTER_FERRY', name: '夜航二号', capacity: 20 });
assert.equal(s.ferries.length, 2);

// 三辆车入队：4t, 5t, 危险品车申请载客舱
dispatch(veh('A1', 4));
dispatch(veh('A2', 5));
dispatch(veh('H1', 3, 'hazmat', 'passenger'));
assert.equal(s.queue.length, 3);

// 正常装载两辆
dispatch({ type: 'LOAD_ONE', ferryId: s.ferries[0].id });
dispatch({ type: 'LOAD_ONE', ferryId: s.ferries[0].id });
assert.equal(s.ferries[0].loaded.length, 2);
assert.equal(s.queue.length, 1);
assert.equal(s.queue[0].plate, 'H1');

// 危险品进载客舱 -> 整车拒绝，队列与已装不变
dispatch({ type: 'LOAD_ONE', ferryId: s.ferries[0].id });
assert.equal(s.queue.length, 1, '被拒车辆不得离队');
assert.equal(s.ferries[0].loaded.length, 2, '已装状态不变');
assert.equal(s.records[0].kind, 'reject');
assert.equal(s.records[0].reason, 'hazmat');

// 危险品车离开队列，再来一辆超重车（4+5+2 > 10）
dispatch({ type: 'REMOVE_QUEUE', id: s.queue[0].id });
dispatch(veh('B1', 2, 'truck', 'vehicle'));
const beforeQ = s.queue.length;
const beforeLoaded = s.ferries[0].loaded.length;
dispatch({ type: 'LOAD_ONE', ferryId: s.ferries[0].id });
assert.equal(s.queue.length, beforeQ, '超重拒绝：队列不变');
assert.equal(s.ferries[0].loaded.length, beforeLoaded, '超重拒绝：已装不变');
assert.equal(s.records[0].reason, 'overweight');

// “顺序装到满”对一号无变化；改让二号(上限20)连装
dispatch({ type: 'LOAD_ALL', ferryId: s.ferries[0].id });
assert.equal(s.queue.length, beforeQ);
dispatch({ type: 'LOAD_ALL', ferryId: s.ferries[1].id });
assert.equal(s.queue.length, 0);
assert.equal(s.ferries[1].loaded.length, 1);
assert.equal(s.ferries[1].loaded[0].plate, 'B1');

// 再登两辆车，一号连装：已装 9t(A1+A2)，C1 可装、C2 将超重被拒（停在 3 辆）
dispatch(veh('C1', 1));
dispatch(veh('C2', 1));
dispatch({ type: 'LOAD_ALL', ferryId: s.ferries[0].id });
assert.deepEqual(s.ferries[0].loaded.map((v) => v.plate), ['A1', 'A2', 'C1']);
assert.equal(s.queue[0].plate, 'C2');
assert.equal(s.records[0].kind, 'reject');
assert.equal(s.records[0].reason, 'overweight');
// 清掉 C2，再验证检修回队顺序
dispatch({ type: 'REMOVE_QUEUE', id: s.queue[0].id });
dispatch({ type: 'SET_MAINTENANCE', ferryId: s.ferries[0].id });
assert.equal(s.ferries[0].status, 'maintenance');
assert.equal(s.ferries[0].loaded.length, 0);
assert.deepEqual(s.queue.map((v) => v.plate), ['A1', 'A2', 'C1'], '检修车辆按原顺序回队');
assert.equal(s.records[0].kind, 'maintenance');
assert.equal(s.records[0].successor, '夜航二号');

// 后续渡轮自动接替：当前在役第一艘是二号，装载应上二号
dispatch({ type: 'LOAD_ONE', ferryId: s.ferries[1].id });
assert.equal(s.queue[0]?.plate, 'A2');
assert.equal(s.ferries[1].loaded.at(-1).plate, 'A1');
// 二号放行离港，记录接替关系；一号仍在检修，无下一在役
dispatch({ type: 'DEPART', ferryId: s.ferries[1].id });
assert.equal(s.ferries[1].loaded.length, 0);
assert.equal(s.ferries[1].voyages, 1);
assert.equal(s.records[0].kind, 'depart');
assert.equal(s.records[0].successor, null); // 唯一在役就是二号自己

// 一号检修完成重新投运
dispatch({ type: 'RESUME', ferryId: s.ferries[0].id });
assert.equal(s.ferries[0].status, 'active');

// 放行时记录接替者
dispatch({ type: 'LOAD_ONE', ferryId: s.ferries[0].id }); // A2
dispatch({ type: 'DEPART', ferryId: s.ferries[0].id });
assert.equal(s.records[0].successor, '夜航二号');

console.log('✅ 全部规则测试通过');
