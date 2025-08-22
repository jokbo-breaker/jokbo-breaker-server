import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { Menu } from '../models/Menu';
import { Store } from '../models/Store';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { CreateOrderRequest, CreateOrderResponse, OrderListResponse, CancelOrderResponse } from '../types/order.types';

const router = express.Router();

/**
 * @route   POST /order
 * @desc    새 주문 생성
 * @access  Private
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const {
      menuId,
      quantity,
      orderType,
      paymentMethod,
      phoneNumber
    }: CreateOrderRequest = req.body;

    // 입력 검증
    if (!menuId || !quantity || !orderType || !paymentMethod) {
      res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다. (menuId, quantity, orderType, paymentMethod)',
      });
      return;
    }

    if (quantity < 1) {
      res.status(400).json({
        success: false,
        message: '수량은 1 이상이어야 합니다.',
      });
      return;
    }

    // 배달 주소는 선택사항 (GPS 위도/경도로 처리 가능)

    // 메뉴 정보 조회
    const menu = await Menu.findById(menuId).populate('store').lean();
    if (!menu) {
      res.status(404).json({
        success: false,
        message: '메뉴를 찾을 수 없습니다.',
      });
      return;
    }

    const store = menu.store as any;

    // 재고 확인
    if (menu.stockLeft < quantity) {
      res.status(400).json({
        success: false,
        message: `재고가 부족합니다. 현재 재고: ${menu.stockLeft}개`,
      });
      return;
    }

    // 배달 주문 검증
    if (orderType === 'delivery') {
      if (!menu.isDeliveryAvailable || !store.supportsDelivery) {
        res.status(400).json({
          success: false,
          message: '이 메뉴는 배달이 불가능합니다.',
        });
        return;
      }
    }

    // 가격 계산
    const unitPrice = orderType === 'pickup' ? menu.pickupPrice : menu.discountedPrice;
    const totalPrice = unitPrice * quantity;
    const totalGrams = menu.gramPerUnit * quantity;
    const deliveryFee = orderType === 'delivery' ? (menu.deliveryPrice || 0) : 0;
    const finalAmount = totalPrice + deliveryFee;

    // 주문 생성
    const orderData = {
      userId: user._id,
      storeId: store._id,
      storeName: store.name,
      items: [{
        menuId: menu._id,
        menuName: menu.name,
        quantity,
        gramPerUnit: menu.gramPerUnit,
        unitPrice,
        totalPrice,
        totalGrams,
      }],
      orderType,
      paymentMethod,
      totalQuantity: quantity,
      totalAmount: totalPrice,
      totalGrams,
      deliveryFee,
      finalAmount,
      pickupStartTime: orderType === 'pickup' ? menu.pickupStartTime : null,
      pickupEndTime: orderType === 'pickup' ? menu.pickupEndTime : null,
      deliveryStartTime: orderType === 'delivery' ? menu.deliveryStartTime : null,
      phoneNumber: phoneNumber || null,
    };

    const order = new Order(orderData);
    await order.save();

    // 메뉴 재고 감소 및 판매량 증가
    await Menu.findByIdAndUpdate(menuId, {
      $inc: {
        stockLeft: -quantity,
        totalSoldCount: quantity,
      }
    });

    // 사용자 누적 통계 업데이트
    await User.findByIdAndUpdate(user._id, {
      $inc: {
        totalPurchaseCount: 1,
        totalFoodAmount: totalGrams,
      }
    });

    console.log('🎉 ===== 주문 생성 완료 =====');
    console.log('👤 주문자:', user.name);
    console.log('🏪 매장:', store.name);
    console.log('🍔 메뉴:', menu.name, `x${quantity}`);
    console.log('💰 결제 금액:', finalAmount, '원');
    console.log('📦 주문 유형:', orderType);
    console.log('💳 결제 방법:', paymentMethod);
    console.log('===============================');

    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const HH = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}${MM}${dd} ${HH}:${mm}:${ss}`;
    };

    const response: CreateOrderResponse = {
      success: true,
      message: '주문이 성공적으로 생성되었습니다.',
      order: {
        orderId: (order._id as any).toString(),
        storeName: store.name,
        items: order.items,
        orderType: order.orderType,
        paymentMethod: order.paymentMethod,
        totalQuantity: order.totalQuantity,
        totalAmount: order.totalAmount,
        totalGrams: order.totalGrams,
        deliveryFee: order.deliveryFee,
        finalAmount: order.finalAmount,
        status: order.status,
        orderDate: fmt(order.orderDate),
        pickupStartTime: order.pickupStartTime ? fmt(order.pickupStartTime) : undefined,
        pickupEndTime: order.pickupEndTime ? fmt(order.pickupEndTime) : undefined,
        deliveryStartTime: order.deliveryStartTime ? fmt(order.deliveryStartTime) : undefined,
        phoneNumber: order.phoneNumber || undefined,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('❌ 주문 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * @route   GET /order
 * @desc    사용자의 주문 내역 조회
 * @access  Private
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // orderType 필터링 (pickup, delivery, 또는 전체)
    const orderType = req.query.orderType as string;
    const filter: any = { userId: user._id };

    if (orderType && (orderType === 'pickup' || orderType === 'delivery')) {
      filter.orderType = orderType;
    }

    const orders = await Order.find(filter)
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalCount = await Order.countDocuments(filter);

    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const HH = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}${MM}${dd} ${HH}:${mm}:${ss}`;
    };

    // 각 주문의 메뉴 정보를 populate
    const ordersWithMenuInfo = await Promise.all(
      orders.map(async (order) => {
        const itemsWithMenuInfo = await Promise.all(
          order.items.map(async (item) => {
            const menu = await Menu.findById(item.menuId).lean();
            const originalMenuPrice = menu?.originalPrice || item.unitPrice;

            return {
              ...item,
              menuImageUrls: menu?.imageUrls || [],
              originalMenuPrice,
              originalTotalPrice: originalMenuPrice * item.quantity, // 할인 전 총 가격
              discountedMenuPrice: menu?.discountedPrice || item.unitPrice,
              discountedPercentage: menu?.discountedPercentage || 0,
              // 픽업 주문일 때만 픽업 가격 포함
              ...(order.orderType === 'pickup' ? {
                pickupPrice: menu?.pickupPrice
              } : {}),
              currentStockLeft: menu?.stockLeft || 0, // 현재 재고량
            };
          })
        );

        return {
          orderId: (order._id as any).toString(),
          storeId: (order.storeId as any).toString(),
          storeName: order.storeName,
          items: itemsWithMenuInfo,
          orderType: order.orderType,
          paymentMethod: order.paymentMethod,
          totalQuantity: order.totalQuantity,
          totalAmount: order.totalAmount, // 순 주문 금액 (배달비 제외)
          totalGrams: order.totalGrams,
          ...(order.orderType === 'delivery' ? {
            deliveryFee: order.deliveryFee, // 배달 주문일 때만 배달비 표시
          } : {}),
          finalAmount: order.finalAmount, // 최종 결제 금액
          status: order.status,
          orderDate: fmt(order.orderDate),
        };
      })
    );

    const response: OrderListResponse = {
      success: true,
      message: '주문 내역 조회 성공',
      orders: ordersWithMenuInfo,
      totalCount,
    };

    res.json(response);
  } catch (error) {
    console.error('❌ 주문 내역 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * @route   GET /order/:orderId
 * @desc    특정 주문 상세 정보 조회
 * @access  Private
 */
router.get('/:orderId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      userId: user._id,
    }).lean();

    if (!order) {
      res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.',
      });
      return;
    }

    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const HH = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}${MM}${dd} ${HH}:${mm}:${ss}`;
    };

    // 주문의 메뉴 정보를 populate
    const itemsWithMenuInfo = await Promise.all(
      order.items.map(async (item) => {
        const menu = await Menu.findById(item.menuId).lean();
        const originalMenuPrice = menu?.originalPrice || item.unitPrice;

        return {
          ...item,
          menuImageUrls: menu?.imageUrls || [],
          originalMenuPrice,
          originalTotalPrice: originalMenuPrice * item.quantity, // 할인 전 총 가격
          discountedMenuPrice: menu?.discountedPrice || item.unitPrice,
          discountedPercentage: menu?.discountedPercentage || 0,
          // 픽업 주문일 때만 픽업 가격 포함
          ...(order.orderType === 'pickup' ? {
            pickupPrice: menu?.pickupPrice
          } : {}),
          currentStockLeft: menu?.stockLeft || 0, // 현재 재고량
        };
      })
    );

    const response: CreateOrderResponse = {
      success: true,
      message: '주문 상세 정보 조회 성공',
      order: {
        orderId: (order._id as any).toString(),
        storeName: order.storeName,
        items: itemsWithMenuInfo,
        orderType: order.orderType,
        paymentMethod: order.paymentMethod,
        totalQuantity: order.totalQuantity,
        totalAmount: order.totalAmount,
        totalGrams: order.totalGrams,
        deliveryFee: order.deliveryFee,
        finalAmount: order.finalAmount,
        status: order.status,
        orderDate: fmt(order.orderDate),
        pickupStartTime: order.pickupStartTime ? fmt(order.pickupStartTime) : undefined,
        pickupEndTime: order.pickupEndTime ? fmt(order.pickupEndTime) : undefined,
        deliveryStartTime: order.deliveryStartTime ? fmt(order.deliveryStartTime) : undefined,
        phoneNumber: order.phoneNumber || undefined,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('❌ 주문 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * @route   DELETE /order/:orderId
 * @desc    주문 취소 (주문 상태를 cancelled로 변경 + 재고/사용자 통계 롤백)
 * @access  Private
 */
router.delete('/:orderId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { orderId } = req.params;

    // 주문 조회 (본인 주문인지 확인)
    const order = await Order.findOne({
      _id: orderId,
      userId: user._id,
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.',
      });
      return;
    }

    // 이미 취소된 주문인지 확인
    if (order.status === 'cancelled') {
      res.status(400).json({
        success: false,
        message: '이미 취소된 주문입니다.',
      });
      return;
    }

    // 완료된 주문은 취소 불가
    if (order.status === 'completed') {
      res.status(400).json({
        success: false,
        message: '완료된 주문은 취소할 수 없습니다.',
      });
      return;
    }

    console.log('🗑️ ===== 주문 취소 처리 시작 =====');
    console.log('👤 사용자:', user.name);
    console.log('📦 주문 ID:', orderId);
    console.log('🏪 매장:', order.storeName);
    console.log('💰 취소 금액:', order.finalAmount, '원');

    // 트랜잭션으로 안전하게 처리
    const session = await Order.startSession();
    await session.withTransaction(async () => {
      // 1. 주문 상태를 'cancelled'로 변경
      await Order.findByIdAndUpdate(
        orderId,
        {
          status: 'cancelled',
          updatedAt: new Date(),
        },
        { session }
      );

      // 2. 각 메뉴의 재고 복구 및 판매량 차감
      for (const item of order.items) {
        await Menu.findByIdAndUpdate(
          item.menuId,
          {
            $inc: {
              stockLeft: item.quantity,        // 재고 복구
              totalSoldCount: -item.quantity,  // 판매량 차감
            }
          },
          { session }
        );

        console.log(`📦 메뉴 "${item.menuName}" 재고 복구: +${item.quantity}개`);
      }

      // 3. 사용자 통계 롤백
      await User.findByIdAndUpdate(
        user._id,
        {
          $inc: {
            totalPurchaseCount: -1,              // 주문 횟수 차감
            totalFoodAmount: -order.totalGrams,  // 음식량 차감
          }
        },
        { session }
      );

      console.log(`👤 사용자 통계 롤백: 주문횟수 -1, 음식량 -${order.totalGrams}g`);
    });

    await session.endSession();

    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const HH = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}${MM}${dd} ${HH}:${mm}:${ss}`;
    };

    console.log('✅ ===== 주문 취소 완료 =====');

    const response: CancelOrderResponse = {
      success: true,
      message: '주문이 성공적으로 취소되었습니다.',
      cancelledOrder: {
        orderId: orderId,
        storeName: order.storeName,
        finalAmount: order.finalAmount,
        cancelledAt: fmt(new Date()),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('❌ 주문 취소 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
});

export default router;
